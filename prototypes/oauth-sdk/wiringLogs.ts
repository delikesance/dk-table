/**
 * Journaux techniques du cablage: journal du run courant, diagnostic de fin, source pour /logs.
 *
 * Quoi : `createRunLogs({cwd, env})` -> `cur()` (journal courant: run en cours, sinon « hors run »), `startRun()`,
 *        `endRun()` (diagnostic ecrit dans `.boucle/logs/<run>.diagnostic.md`), `source` (LogSource pour server.ts).
 * Usage : `const rl = createRunLogs({ cwd, env }); wrapRun(run, rl.cur)`.
 */
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { diagnose } from "./diagnostic";
import { createLogs, type Logger } from "./logger";
import { filterEntries, listRuns, readRun } from "./logRead";
import type { LogSource } from "./logRoutes";

/** Cree le gestionnaire de journaux (dossier `.boucle/logs`, ignore par git). */
export function createRunLogs(o: { cwd: string; env: Record<string, string | undefined> }) {
  const dir = join(o.cwd, ".boucle", "logs"), logs = createLogs({ dir, env: o.env });
  let run: Logger | null = null, idle: Logger | null = null;
  const cur = (): Logger => run ?? (idle ??= logs.start());
  const startRun = (): Logger => (run = logs.start());
  /** Fin de run: diagnostic ecrit et renvoye. */
  const endRun = async (): Promise<string> => {
    const r = run; run = null;
    if (!r) return "";
    const text = diagnose(await readRun(dir, r.run));
    await writeFile(join(dir, r.run + ".diagnostic.md"), text, "utf8").catch(() => {});
    return text;
  };
  const latest = async (id?: string) => id ?? (await listRuns(dir)).find((r) => r !== idle?.run); // le dernier vrai run, pas « hors run »
  const source: LogSource = {
    runs: async () => (await listRuns(dir)).filter((r) => !r.endsWith(".diagnostic")),
    entries: async (id, f) => { const r = await latest(id); return r ? filterEntries(await readRun(dir, r), f) : []; },
    diagnostic: async (id) => { const r = await latest(id); return r ? diagnose(await readRun(dir, r)) : "Aucun journal."; },
  };
  return { cur, startRun, endRun, source };
}
