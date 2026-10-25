/**
 * Instrumentation du journal technique: enveloppes autour des commandes, appels modele, evenements et cartes.
 *
 * Quoi : `wrapRun(run, log)` (cmd, cwd, code, duree, sortie), `wrapQuery(query, log)` (modele, cout, tours, budget, erreurs;
 *        jamais `options.env`), `logEvent(log, e)` (evenement du pipeline -> ligne), `trackBoard(log, prev, cartes)` (transitions
 *        d'etat avec cause, anomalies). `log` est une fonction: le journal du run courant.
 * Pourquoi : un seul point de cablage (wiring.ts), aucun changement du comportement des modules enveloppes.
 * Usage : `const run = wrapRun(o.run, cur); const query = wrapQuery(o.query, cur)`.
 */
import type { BoardCard } from "./cards";
import type { Run } from "./git";
import type { Logger } from "./logger";
import type { QueryFn } from "./research";
import type { BoucleEvent } from "./server";

/** Commandes git de lecture: un code non nul y est normal (verification d'existence...). */
const READ_ONLY = new Set(["rev-parse", "diff", "status", "rev-list", "show", "ls-tree", "cat-file", "remote", "log"]);

/** Enveloppe `run`: chaque commande est journalisee (info npm/npx, debug git ok, warn si echec utile). */
export function wrapRun(run: Run, log: () => Logger): Run {
  return async (cmd, args, cwd) => {
    const t = Date.now(), line = [cmd, ...args].join(" ");
    try {
      const r = await run(cmd, args, cwd);
      const quiet = cmd === "git" && READ_ONLY.has(args[0]);
      const level = r.code === 0 ? (cmd === "git" ? "debug" : "info") : quiet ? "debug" : "warn";
      log()[level]("cmd", r.code === 0 ? "commande ok" : "commande en echec", { cmd: line, cwd, code: r.code, durMs: Date.now() - t, out: r.code === 0 && cmd === "git" ? "" : r.out });
      return r;
    } catch (err) {
      log().error("cmd", "commande impossible", { cmd: line, cwd, durMs: Date.now() - t, err });
      throw err;
    }
  };
}

/** Enveloppe `query`: laisse passer les messages; journalise le resultat (cout, tours, duree) ou l'erreur. */
export function wrapQuery(query: QueryFn, log: () => Logger): QueryFn {
  return (a) => (async function* () {
    const o = a.options, t = Date.now();
    const ctx = { model: o.model, maxTurns: o.maxTurns, maxBudgetUsd: o.maxBudgetUsd, cwd: o.cwd };
    log().debug("modele", "appel", { ...ctx, prompt: a.prompt.slice(0, 200) }); // jamais options.env
    try {
      for await (const m of query(a)) {
        const r = m as { type?: string; subtype?: string; total_cost_usd?: number; num_turns?: number; duration_ms?: number };
        if (r.type === "result") {
          log()[r.subtype === "success" ? "info" : "warn"]("modele", "resultat", { ...ctx, subtype: r.subtype, costUsd: r.total_cost_usd ?? 0, turns: r.num_turns, apiMs: r.duration_ms, durMs: Date.now() - t });
        }
        yield m;
      }
    } catch (err) {
      log().error("modele", "appel en erreur", { ...ctx, durMs: Date.now() - t, err });
      throw err;
    }
  })();
}

/** Ligne de journal pour un evenement du pipeline (agent et carte portes en contexte). */
export function logEvent(log: Logger, e: BoucleEvent): void {
  const l = e.agent || e.cardId ? log.child({ agent: e.agent, card: e.cardId }) : log;
  const msg = e.message ?? "";
  const extra = { sector: e.sector, axis: e.axis, costUsd: e.costUsd, elapsedS: e.elapsedS, ok: e.ok, round: e.round, phase: e.phase };
  const comp = e.sector ?? "pipeline";
  if (e.type === "error") return l.error(comp, msg, extra);
  if (e.type === "card") return l.debug("rapport", "rapport mis a jour", { sector: e.sector });
  if (e.type === "info" && /non fusionne|refus|anomalie|conflit|echec|perime/i.test(msg)) return l.warn(comp, msg.slice(0, 120), { ...extra, reason: msg });
  l.info(comp, e.type === "info" ? msg : `${e.type}${msg ? " : " + msg : ""}`, extra);
}

/** Journalise les changements d'etat des cartes depuis `prev` (mis a jour) et les anomalies. */
export function trackBoard(log: Logger, prev: Map<string, string>, cards: BoardCard[]): void {
  for (const c of cards) {
    const was = prev.get(c.id);
    if (was === c.state) continue;
    prev.set(c.id, c.state);
    const cause = c.anomalies[0] ?? (c.missing.length ? "manque : " + c.missing.join(", ") : undefined);
    log[c.anomalies.length ? "warn" : "info"]("carte", "transition", { card: c.id, from: was, to: c.state, cause });
  }
}
