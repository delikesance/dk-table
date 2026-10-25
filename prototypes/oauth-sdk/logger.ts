/**
 * Journal technique de la boucle: JSON Lines, un fichier par run dans `.boucle/logs/`.
 *
 * Quoi : `createLogs({dir, env, level, maxBytes, maxFiles, now})` -> `start()` ouvre un run et renvoie un
 *        `Logger` (`debug|info|warn|error(composant, message, champs)`, `child({agent, card})`).
 *        Chaque ligne: ts ISO, ms depuis le debut du run, level, comp, run, agent, card, msg + champs
 *        (cmd, code, out, model, costUsd, turns, from, to, cause, err{message,stack}...).
 * Pourquoi : retrouver la cause d'un probleme sans rejouer le run. Separe du journal lisible du panneau.
 * Garanties : secrets masques (logRedact), sortie sans ANSI et tronquee, taille max par run, rotation des
 *        fichiers, ne leve jamais. Niveau: `BOUCLE_LOG=debug|info|warn|error` (defaut info).
 * Usage : `const l = createLogs({ dir: ".boucle/logs", env }).start(); l.info("git", "fusion", { cmd, code })`.
 */
import { appendFileSync, mkdirSync, readdirSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { clip, createRedactor, stripAnsi } from "./logRedact";

export type Level = "debug" | "info" | "warn" | "error";
const RANK: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 };

/** Niveau depuis `BOUCLE_LOG` (insensible a la casse); inconnu ou absent -> info. */
export const levelOf = (v?: string): Level => (v && v.toLowerCase() in RANK ? (v.toLowerCase() as Level) : "info");

/** Journal d'un run (ou d'un sous-contexte agent/carte). */
export interface Logger {
  readonly run: string;
  debug(comp: string, msg: string, f?: Record<string, unknown>): void;
  info(comp: string, msg: string, f?: Record<string, unknown>): void;
  warn(comp: string, msg: string, f?: Record<string, unknown>): void;
  error(comp: string, msg: string, f?: Record<string, unknown>): void;
  child(ctx: { agent?: string; card?: string }): Logger;
}

/** Options de `createLogs`. */
export interface LogOpts { dir: string; env?: Record<string, string | undefined>; level?: Level; maxBytes?: number; maxFiles?: number; now?: () => number }

/** Supprime les plus anciens fichiers `.jsonl` au-dela de `keep`. */
function prune(dir: string, keep: number): void {
  try {
    const all = readdirSync(dir).filter((f) => f.endsWith(".jsonl")).map((f) => ({ f, t: statSync(join(dir, f)).mtimeMs })).sort((a, b) => b.t - a.t);
    for (const x of all.slice(keep)) unlinkSync(join(dir, x.f));
  } catch { /* rotation au mieux */ }
}

/** Fabrique de journaux de run. */
export function createLogs(o: LogOpts): { start(): Logger } {
  const now = o.now ?? Date.now, red = createRedactor(o.env ?? {});
  const min = RANK[o.level ?? levelOf(o.env?.BOUCLE_LOG)], maxBytes = o.maxBytes ?? 5_000_000;
  let seq = 0;
  return {
    start(): Logger {
      const t0 = now(), run = new Date(t0).toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "") + "-" + ++seq;
      const file = join(o.dir, run + ".jsonl");
      let bytes = 0, cut = false;
      try { mkdirSync(o.dir, { recursive: true }); writeFileSync(file, ""); prune(o.dir, o.maxFiles ?? 30); } catch { /* ecriture impossible: no-op */ }
      const write = (level: Level, ctx: object, comp: string, msg: string, f: Record<string, unknown> = {}): void => {
        if (RANK[level] < min) return;
        try {
          const fields = red.deep(Object.fromEntries(Object.entries(f).map(([k, v]) => [k,
            typeof v === "string" ? clip(stripAnsi(v), k === "out" ? 2000 : 1000) : v])));
          const line = JSON.stringify({ ts: new Date(now()).toISOString(), ms: now() - t0, level, comp, run, ...ctx, msg: clip(red(stripAnsi(msg)), 500), ...fields }) + "\n";
          if (bytes + line.length > maxBytes * (level === "error" ? 2 : 1)) {
            if (!cut) { cut = true; appendFileSync(file, JSON.stringify({ ts: new Date(now()).toISOString(), level: "warn", comp: "log", run, msg: "journal tronqué (taille maximale atteinte)" }) + "\n"); }
            return;
          }
          bytes += line.length; appendFileSync(file, line);
        } catch { /* un log ne doit jamais casser la boucle */ }
      };
      const make = (ctx: object): Logger => ({
        run,
        debug: (c, m, f) => write("debug", ctx, c, m, f), info: (c, m, f) => write("info", ctx, c, m, f),
        warn: (c, m, f) => write("warn", ctx, c, m, f), error: (c, m, f) => write("error", ctx, c, m, f),
        child: (x) => make({ ...ctx, ...x }),
      });
      return make({});
    },
  };
}
