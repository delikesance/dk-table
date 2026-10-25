/**
 * Lecture des journaux techniques (`.boucle/logs/<run>.jsonl`) et filtres.
 *
 * Quoi : `listRuns(dir)` (ids, plus recent d'abord), `readRun(dir, run)` (lignes illisibles ignorees; id invalide -> []),
 *        `filterEntries(entrees, { card, agent, level, comp, q, limit })`.
 * Usage : `filterEntries(await readRun(dir, run), { level: "warn", card: "texte-en-colonnes" })`.
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import type { Level } from "./logger";

/** Une ligne du journal (champs libres en plus des champs fixes). */
export interface LogEntry { ts: string; ms: number; level: Level; comp: string; run: string; msg: string; agent?: string; card?: string; [k: string]: unknown }

/** Filtre de lecture; `limit` garde les derniers resultats. */
export interface LogFilter { card?: string; agent?: string; level?: Level; comp?: string; q?: string; limit?: number }

const RANK: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const ID = /^[\w.-]+$/;

/** Ids des runs presents, le plus recent d'abord. */
export async function listRuns(dir: string): Promise<string[]> {
  const names = (await readdir(dir).catch(() => [] as string[])).filter((f) => f.endsWith(".jsonl"));
  const t = await Promise.all(names.map(async (f) => [f.slice(0, -6), (await stat(join(dir, f)).catch(() => null))?.mtimeMs ?? 0] as const));
  return t.sort((a, b) => b[1] - a[1]).map(([id]) => id);
}

/** Lignes d'un run; vide si l'id est invalide (pas de `..`) ou le fichier absent. */
export async function readRun(dir: string, run: string): Promise<LogEntry[]> {
  if (!ID.test(run) || run.includes("..")) return [];
  const out: LogEntry[] = [];
  for (const line of (await readFile(join(dir, run + ".jsonl"), "utf8").catch(() => "")).split(/\r?\n/)) {
    try { const e = JSON.parse(line); if (e && typeof e.msg === "string") out.push(e); } catch { /* ligne tronquee */ }
  }
  return out;
}

/** Applique le filtre (carte: champ `card` ou liste `agent`). */
export function filterEntries(es: LogEntry[], f: LogFilter): LogEntry[] {
  const inList = (e: LogEntry, id: string) => String(e.agent ?? "").split(",").map((x) => x.trim()).includes(id);
  const q = f.q?.toLowerCase();
  const r = es.filter((e) =>
    (!f.card || e.card === f.card || inList(e, f.card)) && (!f.agent || inList(e, f.agent) || e.card === f.agent)
    && (!f.level || RANK[e.level] >= RANK[f.level]) && (!f.comp || e.comp === f.comp)
    && (!q || JSON.stringify(e).toLowerCase().includes(q)));
  return f.limit && f.limit > 0 ? r.slice(-f.limit) : r;
}
