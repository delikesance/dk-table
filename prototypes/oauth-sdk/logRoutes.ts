/**
 * Routes HTTP du journal technique: `GET /logs` (JSON) et `GET /diagnostic` (texte brut, a coller dans le chat).
 *
 * Quoi : `handleLogs(req, res, logs)` repond et renvoie true si la route est la sienne.
 *        Parametres de /logs: run (defaut: dernier), card, agent, level (debug|info|warn|error), comp, q, limit.
 * Usage : dans server.ts, `if (deps.logs && handleLogs(req, res, deps.logs)) return;`.
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import type { LogEntry, LogFilter } from "./logRead";

/** Source des journaux (injectee). */
export interface LogSource {
  runs(): Promise<string[]>;
  entries(run: string | undefined, f: LogFilter): Promise<LogEntry[]>;
  diagnostic(run?: string): Promise<string>;
}

/** Filtre depuis la requete; valeurs invalides ignorees. */
export function filterOf(q: URLSearchParams): LogFilter {
  const f: LogFilter = {};
  for (const k of ["card", "agent", "comp", "q"] as const) if (q.get(k)) f[k] = q.get(k)!;
  const lv = q.get("level");
  if (lv === "debug" || lv === "info" || lv === "warn" || lv === "error") f.level = lv;
  const n = Number(q.get("limit"));
  if (Number.isInteger(n) && n > 0) f.limit = Math.min(n, 5000);
  return f;
}

/** Traite /logs et /diagnostic; false si la route n'est pas la sienne. */
export function handleLogs(req: IncomingMessage, res: ServerResponse, logs: LogSource): boolean {
  if (req.method !== "GET") return false;
  const u = new URL(req.url ?? "/", "http://127.0.0.1");
  const run = u.searchParams.get("run") || undefined;
  const fail = () => void res.writeHead(500, { "content-type": "application/json" }).end('{"error":"journal indisponible"}');
  if (u.pathname === "/logs") {
    Promise.all([logs.runs(), logs.entries(run, filterOf(u.searchParams))]).then(([runs, entries]) =>
      void res.writeHead(200, { "content-type": "application/json; charset=utf-8" }).end(JSON.stringify({ runs, run: run ?? runs[0] ?? null, entries })), fail);
    return true;
  }
  if (u.pathname === "/diagnostic") {
    logs.diagnostic(run).then((t) => void res.writeHead(200, { "content-type": "text/plain; charset=utf-8" }).end(t), fail);
    return true;
  }
  return false;
}
