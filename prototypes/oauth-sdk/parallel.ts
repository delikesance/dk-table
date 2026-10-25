/**
 * Tournee en parallele : un agent par carte independante, fusion serialisee, repli en serie sur conflit.
 *
 * Quoi : `runBatch(lot, ctx)` separe le lot (`independent.ts`) : les cartes independantes partent ensemble (au plus `n` agents,
 *        chacun dans son worktree), les cartes liees et celles qui ont deja fait un conflit sont traitees ensuite par UN agent,
 *        en serie. Une carte dont la fusion entre en conflit avec `developpement` est relancee seule, apres les autres,
 *        sur un worktree neuf (donc a jour) et memorisee (`avoid`) pour ne plus partir en parallele.
 * Pourquoi : l'attente d'un agent est du temps modele; plusieurs cartes avancent en meme temps, mais les fusions restent
 *        un par un (verrou de git.ts) et l'etat des cartes reste coherent (machine a etats, rounds.ts).
 * Usage : `await runBatch(lot, { n: 3, avoid, run, attempt, rules, stop, emit })` -> vrai si tout est fusionne.
 */
import type { BoardCard } from "./cards";
import { runPool } from "./concurrency";
import { splitParallel } from "./independent";
import type { BoucleEvent } from "./server";

/** Resultat d'un agent: fusion faite, ou conflit avec developpement (a relancer en serie). */
export interface AgentResult { merged: boolean; conflict?: boolean }

/** Contexte d'une tournee parallele (fourni par rounds.ts / pipeline.ts). */
export interface BatchCtx {
  /** Agents simultanes au plus (1 = un seul agent pour tout le lot). */
  n: number;
  /** Cartes deja en conflit: jamais en parallele (partage entre tournees). */
  avoid: Set<string>;
  stop: () => boolean;
  emit: (e: BoucleEvent) => void;
  /** Tentative (rang de modele) du groupe de cartes. */
  attempt: (ids: string[]) => number;
  /** Consigne de rapport et de preuves pour ces cartes. */
  rules: (cards: BoardCard[]) => string;
  /** Un agent: worktree, travail, commit, fusion. */
  run: (cards: BoardCard[], task: string, attempt: number) => Promise<AgentResult>;
}

const ids = (cs: { id: string }[]) => cs.map((c) => c.id);

/** Traite le lot; vrai si toutes les fusions ont abouti. */
export async function runBatch(batch: BoardCard[], c: BatchCtx): Promise<boolean> {
  const one = (cards: BoardCard[]) => c.run(cards, c.rules(cards), c.attempt(ids(cards)));
  if (c.n < 2 || batch.length < 2) return (await one(batch)).merged;
  const { par, ser } = splitParallel(batch, c.avoid);
  if (par.length < 2) return (await one(batch)).merged;
  c.emit({ type: "info", message: `agents en parallele (${Math.min(c.n, par.length)} a la fois) : ${ids(par).join(", ")}${ser.length ? `; en serie ensuite : ${ids(ser).join(", ")}` : ""}` });
  let ok = true;
  const retry: BoardCard[] = [];
  const results = await runPool(par, c.n, (card) => one([card]), {
    stop: c.stop,
    onError: (e, card) => { ok = false; c.emit({ type: "error", message: `agent ${card.id} : ${(e as Error).message}` }); },
  });
  par.forEach((card, i) => {
    const r = results[i];
    if (!r) { ok = false; return; }
    if (r.conflict) { c.avoid.add(card.id); retry.push(card); c.emit({ type: "info", message: `conflit de fusion sur ${card.id} : relancee seule apres les autres` }); } else if (!r.merged) ok = false;
  });
  const rest = [...ser, ...retry];
  if (rest.length && !c.stop()) ok = (await one(rest)).merged && ok;
  else if (rest.length) ok = false;
  return ok;
}
