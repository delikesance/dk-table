/**
 * Serveur HTTP local du panneau "boucle" (node:http uniquement).
 * Routes: GET / (panneau), GET /moodboard(.html), POST /go, POST /stop, GET /events (SSE avec rejeu).
 * Le pipeline réel est injecté (`deps.runPipeline`); écoute sur 127.0.0.1 seulement.
 */
import { ASSETS } from "./assets";
import { isFontRoute, readFont } from "./fontRoute";
import type { DesignFile } from "./designs";
import { injectRuntime } from "./designRuntime";
import { handleLogs, type LogSource } from "./logRoutes";
import type { MoodCard } from "./moodboard";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createServer as httpServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

/** Options passées au pipeline. */
export interface RunOpts { budgetEur: number; onEvent: (e: BoucleEvent) => void; signal: AbortSignal }

/** Événement de progression envoyé au panneau. */
export interface BoucleEvent {
  /** `file`: fichier de design ecrit/mis a jour (`message` = nom, secteur design). */
  type: "start" | "end" | "info" | "error" | "done" | "summary" | "file" | "card";
  /** `card`: carte dont le rapport a change; `done`: toutes les cartes sont terminees; `round`: tournee. */
  cardId?: string; /** Agent en parallele (carte(s) qu'il traite) qui a emis l'evenement. */ agent?: string; complete?: boolean; reason?: string; round?: number; cards?: string[];
  /** `phase`/`ok`: resume de fin de phase (ok = fusionnee). */
  phase?: string; ok?: boolean;
  /** Evenement `file`: etat du fichier de design et horodatage (ms). */
  state?: "ecrit" | "mis-a-jour"; ts?: number;
  sector?: string; axis?: string; costUsd?: number; elapsedS?: number;
  totalUsd?: number; remainingUsd?: number; message?: string;
}

/** Dépendances injectées. */
export interface Deps {
  runPipeline: (o: RunOpts) => Promise<void | { complete: boolean; reason?: string }>;
  parseBudgetEur: (v: unknown) => number;
  /** Page du panneau (fonction: relue a chaque requete). */
  panelHtml: string | (() => string);
  /** Dossier des assets /panel.css et /panel.js (liste blanche, relus a chaque requete; absent: 404). */
  assetsDir?: string;
  /** Cartes du moodboard (absent: GET /moodboard => 404 + liste vide). */
  moodboard?: () => Promise<MoodCard[]>;
  /** Rapport d'une carte (JSON, null: 404); /reports/<id>. */
  report?: (id: string) => Promise<unknown | null>;
  /** Capture PNG sous docs/screenshots (null: 404); /shots/<chemin>. */
  shot?: (rel: string) => Promise<Buffer | null>;
  /** Page du moodboard (absente: 404). */
  moodboardHtml?: string | (() => string | undefined);
  /** Designs du secteur design (absent: /designs => 404). `steps` = evenements du secteur design. */
  designs?: { list: () => Promise<DesignFile[]>; read: (name: string) => Promise<string | null>; steps: () => BoucleEvent[] };
  designHtml?: string | (() => string | undefined);
  onEmit?: (e?: BoucleEvent) => void; /** Appele a chaque evenement (invalide les caches derives). */
  logs?: LogSource; /** Journaux techniques: GET /logs et /diagnostic (absent: 404). */
}

/** Canevas du design: scripts et animations en ligne permis, aucun reseau ni sortie du cadre. */
const DESIGN_CSP =
  "sandbox allow-scripts; default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; " +
  "img-src data: blob:; font-src data:; media-src data: blob:";
const SHOT = /^docs\/screenshots\/[\w./-]+\.png$/;

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

/** 404: page HTML française pour un navigateur (Accept: text/html), JSON pour l'API. */
function notFound(req: IncomingMessage, res: ServerResponse): void {
  if (!(req.headers.accept ?? "").includes("text/html")) return send(res, 404, { error: "introuvable" });
  res.writeHead(404, { "content-type": "text/html; charset=utf-8" }).end(
    '<!doctype html><meta charset="utf-8"><title>Introuvable</title>' +
    '<body style="font:16px system-ui;margin:2rem"><h1>Page introuvable</h1>' +
    "<p>Cette page n'existe pas (ou le serveur est une ancienne version : relancez-le).</p><p><a href=\"/\">Retour au panneau</a></p>",
  );
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
  /** Numero du run: les identifiants SSE sont `<run>-<rang>` (EventSource les renvoie en `Last-Event-ID` apres une coupure). */
  let run = 0;
  const frame = (e: BoucleEvent, n: number): string => `id: ${run}-${n}\ndata: ${JSON.stringify(e)}\n\n`;

  const emit = (e: BoucleEvent): void => {
    e.ts ??= Date.now();
    history.push(e);
    deps.onEmit?.(e);
    for (const c of clients) c.write(frame(e, history.length - 1));
  };

  const go = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    if (ctl) return send(res, 409, { error: "déjà en cours" });
    let budgetEur: number;
    try { budgetEur = deps.parseBudgetEur((await readJson(req)).budgetEur); }
    catch (err) { return send(res, 400, { error: (err as Error).message }); }
    if (ctl) return send(res, 409, { error: "déjà en cours" });
    const mine = (ctl = new AbortController());
    history.length = 0; run++;
    send(res, 200, { ok: true });
    let complete: boolean | undefined, reason: string | undefined;
    deps.runPipeline({ budgetEur, onEvent: emit, signal: mine.signal })
      .then((r) => { complete = r?.complete; reason = r?.reason; })
      .catch((err) => emit({ type: "error", message: String(err?.message ?? err) }))
      .finally(() => { ctl = null; emit({ type: "done", message: mine.signal.aborted ? "arrêté" : "terminé", complete, reason }); });
  };

  return httpServer((req, res) => {
    if (!isLoopback(req)) { res.writeHead(403).end("forbidden"); return; }
    if (deps.logs && handleLogs(req, res, deps.logs)) return;
    const route = `${req.method} ${(req.url ?? "").split("?")[0]}`;
    if (route === "GET /") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(typeof deps.panelHtml === "function" ? deps.panelHtml() : deps.panelHtml);
    } else if (route in ASSETS && deps.assetsDir) {
      const [file, type] = ASSETS[route];
      readFile(join(deps.assetsDir, file), "utf-8").then(
        (txt) => void res.writeHead(200, { "content-type": type, "x-content-type-options": "nosniff" }).end(txt),
        () => notFound(req, res),
      );
    } else if (isFontRoute(route) && deps.assetsDir) {
      const fail = (): void => notFound(req, res);
      readFont(route, deps.assetsDir).then((b) => b ? void res.writeHead(200, { "content-type": "font/woff2", "x-content-type-options": "nosniff" }).end(b) : fail(), fail);
    } else if (route === "GET /moodboard.html") {
      const page = typeof deps.moodboardHtml === "function" ? deps.moodboardHtml() : deps.moodboardHtml;
      if (page === undefined) return notFound(req, res);
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(page);
    } else if (route === "GET /moodboard") {
      if (!deps.moodboard) return send(res, 404, []);
      deps.moodboard().then((cards) => send(res, 200, cards), () => send(res, 500, { error: "moodboard indisponible" }));
    } else if (route === "GET /design.html") {
      const page = typeof deps.designHtml === "function" ? deps.designHtml() : deps.designHtml;
      if (page === undefined) return notFound(req, res);
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(page);
    } else if (route === "GET /designs" && deps.designs) {
      const d = deps.designs;
      d.list().then((files) => send(res, 200, { files, steps: d.steps() }), () => send(res, 500, { error: "designs indisponibles" }));
    } else if (route.startsWith("GET /designs/") && deps.designs) {
      let name = "";
      try { name = decodeURIComponent(route.slice("GET /designs/".length)); } catch { /* nom invalide */ }
      deps.designs.read(name).then(
        (html) => html === null ? send(res, 404, { error: "introuvable" })
          : void res.writeHead(200, { "content-type": "text/html; charset=utf-8", "content-security-policy": DESIGN_CSP }).end(injectRuntime(html)),
        () => send(res, 500, { error: "lecture impossible" }),
      );
    } else if (route.startsWith("GET /reports/") && deps.report) {
      deps.report(route.slice("GET /reports/".length)).then(
        (r) => r === null ? send(res, 404, { error: "introuvable" }) : send(res, 200, r), () => send(res, 500, { error: "rapport indisponible" }));
    } else if (route.startsWith("GET /shots/") && deps.shot) {
      let rel = "";
      try { rel = decodeURIComponent(route.slice("GET /shots/".length)); } catch { /* chemin invalide */ }
      if (!SHOT.test(rel) || rel.includes("..")) return notFound(req, res);
      deps.shot(rel).then((b) => b ? void res.writeHead(200, { "content-type": "image/png", "x-content-type-options": "nosniff" }).end(b) : notFound(req, res), () => notFound(req, res));
    } else if (route === "POST /go") {
      void go(req, res);
    } else if (route === "POST /stop") {
      ctl?.abort();
      send(res, 200, { ok: true, running: ctl !== null });
    } else if (route === "GET /events") {
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
      // reconnexion du meme run: seulement la suite (sinon le panneau compterait deux fois couts et journal)
      const last = /^(\d+)-(\d+)$/.exec(String(req.headers["last-event-id"] ?? ""));
      history.forEach((e, n) => { if (!(last && Number(last[1]) === run && n <= Number(last[2]))) res.write(frame(e, n)); });
      res.flushHeaders(); // sans historique, l'en-tête ne partirait pas: EventSource resterait en « connexion »
      clients.add(res);
      const beat = setInterval(() => res.write(": ping\n\n"), 15000); // garde la liaison ouverte
      req.on("close", () => { clearInterval(beat); clients.delete(res); });
    } else {
      notFound(req, res);
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
