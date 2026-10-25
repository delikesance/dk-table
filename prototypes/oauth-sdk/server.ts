/**
 * Serveur HTTP local du panneau "boucle" (node:http uniquement).
 * Routes: GET / (panneau), POST /go, POST /stop, GET /events (SSE avec rejeu).
 * Le pipeline réel est injecté (`deps.runPipeline`); écoute sur 127.0.0.1 seulement.
 */
import { createServer as httpServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

/** Options passées au pipeline. */
export interface RunOpts { budgetEur: number; onEvent: (e: BoucleEvent) => void; signal: AbortSignal }

/** Événement de progression envoyé au panneau. */
export interface BoucleEvent {
  type: "start" | "end" | "info" | "error" | "done";
  sector?: string; axis?: string; costUsd?: number; elapsedS?: number;
  totalUsd?: number; remainingUsd?: number; message?: string;
}

/** Dépendances injectées. */
export interface Deps {
  runPipeline: (o: RunOpts) => Promise<void>;
  parseBudgetEur: (v: unknown) => number;
  panelHtml: string;
}

const LOOPBACK_ADDRS = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);

/** Vrai si l'adresse distante et l'en-tête Host sont locaux (anti DNS-rebinding). */
function isLoopback(req: IncomingMessage): boolean {
  const host = (req.headers.host ?? "").replace(/:\d+$/, "");
  return LOOPBACK_ADDRS.has(req.socket.remoteAddress ?? "") && LOOPBACK_HOSTS.has(host);
}

/** Lit un corps JSON (limité à 4 Ko); `{}` si vide ou invalide. */
function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (c) => { raw += c; if (raw.length > 4096) req.destroy(); });
    req.on("end", () => { try { resolve(JSON.parse(raw || "{}")); } catch { resolve({}); } });
    req.on("error", () => resolve({}));
  });
}

/** Réponse JSON courte. */
function send(res: ServerResponse, code: number, body: unknown): void {
  res.writeHead(code, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

/** Crée le serveur (non démarré); un seul run à la fois, historique rejoué en SSE. */
export function createServer(deps: Deps): Server {
  const history: BoucleEvent[] = [];
  const clients = new Set<ServerResponse>();
  let ctl: AbortController | null = null;

  const emit = (e: BoucleEvent): void => {
    history.push(e);
    for (const c of clients) c.write(`data: ${JSON.stringify(e)}\n\n`);
  };

  const go = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    if (ctl) return send(res, 409, { error: "déjà en cours" });
    let budgetEur: number;
    try { budgetEur = deps.parseBudgetEur((await readJson(req)).budgetEur); }
    catch (err) { return send(res, 400, { error: (err as Error).message }); }
    if (ctl) return send(res, 409, { error: "déjà en cours" });
    const mine = (ctl = new AbortController());
    history.length = 0;
    send(res, 200, { ok: true });
    deps.runPipeline({ budgetEur, onEvent: emit, signal: mine.signal })
      .catch((err) => emit({ type: "error", message: String(err?.message ?? err) }))
      .finally(() => { ctl = null; emit({ type: "done", message: mine.signal.aborted ? "arrêté" : "terminé" }); });
  };

  return httpServer((req, res) => {
    if (!isLoopback(req)) { res.writeHead(403).end("forbidden"); return; }
    const route = `${req.method} ${(req.url ?? "").split("?")[0]}`;
    if (route === "GET /") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(deps.panelHtml);
    } else if (route === "POST /go") {
      void go(req, res);
    } else if (route === "POST /stop") {
      ctl?.abort();
      send(res, 200, { ok: true, running: ctl !== null });
    } else if (route === "GET /events") {
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
      for (const e of history) res.write(`data: ${JSON.stringify(e)}\n\n`);
      clients.add(res);
      req.on("close", () => clients.delete(res));
    } else {
      send(res, 404, { error: "introuvable" });
    }
  });
}

/** Démarre l'écoute sur 127.0.0.1 uniquement. */
export function listen(server: Server, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve());
  });
}
