/**
 * Planificateur des tournees implementation + correction.
 *
 * Quoi : choisit le lot de chaque tournee (grand lot, cartes les plus avancees d'abord), mesure le progres
 *        par avancee d'etat (idee -> en-cours -> preuves -> termine) et fait tourner les cartes qui
 *        n'avancent pas : apres `tries` essais sans progres, une carte passe derriere les autres, puis est reprise.
 * Pourquoi : la boucle ne s'arrete qu'a la fin des cartes, au budget epuise, ou apres `patience` tournees
 *        sans la moindre avancee; l'arret dit pourquoi (`stopMessage`), jamais « terminee » s'il reste des cartes.
 * Usage : `const p = createPlanner(); p.observe(cards); p.nextBatch(cards); p.observe(cards); p.stuck()`.
 */
import { allDone, type BoardCard } from "./cards";
import { reportRules } from "./reportRules";
import type { BoucleEvent } from "./server";

/** Raison de fin de boucle. */
export type StopReason = "complete" | "budget" | "stuck" | "abort" | "max-rounds";

/** Cartes par tournee. */
export const BATCH = 6;
/** Etats du plus avance au moins avance (reprise des cartes commencees d'abord). */
const RANK: Record<string, number> = { preuves: 0, "en-cours": 1, bloque: 2, piste: 3, idee: 4 };
/** Avancement d'un etat (progres = score qui monte). */
const SCORE: Record<string, number> = { idee: 0, piste: 0, bloque: 1, "en-cours": 1, preuves: 2, termine: 3 };

/** Options du planificateur. */
export interface PlannerOpts { batch?: number; tries?: number; patience?: number; maxRounds?: number }

/** Cree le planificateur d'un run. */
export function createPlanner(o: PlannerOpts = {}) {
  const batch = o.batch ?? BATCH, tries = o.tries ?? 3, patience = o.patience ?? 3;
  const seen = new Map<string, number>();
  const fails = new Map<string, number>();
  let last = new Set<string>();
  let rounds = 0, idle = 0;
  return {
    maxRounds: o.maxRounds ?? 40,
    /** Lot de la tournee: non terminees; celles qui n'avancent plus (>= `tries` echecs) passent derriere. */
    nextBatch<T extends Pick<BoardCard, "id" | "state">>(cards: T[]): T[] {
      const lot = cards.filter((c) => c.state !== "termine")
        .sort((a, b) => Number((fails.get(a.id) ?? 0) >= tries) - Number((fails.get(b.id) ?? 0) >= tries) || (RANK[a.state] ?? 9) - (RANK[b.state] ?? 9))
        .slice(0, batch);
      last = new Set(lot.map((c) => c.id)); rounds++;
      return lot;
    },
    /** Compare a l'etat precedent; vrai si au moins une carte a avance (les cartes du lot sans progres comptent un echec). */
    observe(cards: Pick<BoardCard, "id" | "state">[]): boolean {
      let progress = false;
      for (const c of cards) {
        const now = SCORE[c.state] ?? 0, before = seen.get(c.id);
        const up = before !== undefined && now > before;
        if (up) progress = true;
        if (last.has(c.id)) fails.set(c.id, up || c.state === "termine" ? 0 : (fails.get(c.id) ?? 0) + 1);
        seen.set(c.id, now);
      }
      last = new Set();
      if (rounds > 0) idle = progress ? 0 : idle + 1;
      return progress;
    },
    /** Tentative du lot: plus gros nombre d'echecs d'une de ses cartes (route vers un modele plus gros). */
    attempt: (ids: string[]): number => Math.max(0, ...ids.map((id) => fails.get(id) ?? 0)),
    /** Vrai apres `patience` tournees de suite sans aucune avancee. */
    stuck: () => idle >= patience,
  };
}

/** Phrase d'arret pour le journal et le panneau (cartes restantes nommees avec leur etat). */
export function stopMessage(reason: StopReason, left: Pick<BoardCard, "id" | "state">[]): string {
  const list = left.map((c) => `${c.id} (${c.state})`).join(", ");
  switch (reason) {
    case "complete": return "boucle terminee : toutes les cartes sont terminees";
    case "budget": return `budget epuise : ${left.length} carte(s) restante(s) : ${list}`;
    case "stuck": return `boucle bloquee, aucune carte n'avance : ${list}`;
    case "abort": return `arrete : ${left.length} carte(s) restante(s)`;
    default: return `tournees max atteintes : ${left.length} carte(s) restante(s) : ${list}`;
  }
}

/** Dependances de `runRounds` (injectees par le pipeline). */
export interface RoundsCtx {
  /** Tableau reconcilie; `active` = ids des cartes en cours de traitement (aucune apres une tournee). */
  board: (active?: string[]) => Promise<BoardCard[]>;
  impl: (task: string, attempt: number) => Promise<boolean>;
  corr: (task: string, attempt: number) => Promise<boolean>;
  emit: (e: BoucleEvent) => void;
  /** Raison d'arret immediate (abandon, budget), sinon null. */
  halt: () => "abort" | "budget" | null;
  /** Cartes restantes apres chaque lecture du tableau. */
  progress: (remaining: number) => void;
}

/** Tache de correction ciblee, ecrite par le code a partir des preuves manquantes (aucun modele ne « verifie »). */
function correctionTask(merged: boolean, bad: Pick<BoardCard, "id" | "missing">[]): string {
  const head = merged ? "" : "La derniere fusion a ete refusee (tests ou tsc rouges) : lance `npm test` et `npx tsc --noEmit`, corrige. ";
  return head + "Cartes dont le rapport declare termine sans preuve valide : " + (bad.map((c) => `${c.id} (manque : ${c.missing.join(", ")})`).join("; ") || "aucune") + ".";
}

/**
 * Tournees implementation (+ correction seulement si le code l'exige) jusqu'a cartes terminees, budget epuise,
 * abandon, absence d'avancee ou garde-fou. La validation est du code: fusion refusee (tests/tsc), rapport sans preuves.
 */
export async function runRounds(c: RoundsCtx): Promise<{ complete: boolean; reason: StopReason; cards: BoardCard[] }> {
  const planner = createPlanner();
  const left = (cs: BoardCard[]) => cs.filter((x) => x.state !== "termine");
  let cards = await c.board();
  c.progress(left(cards).length);
  planner.observe(cards);
  let round = 0, reason: StopReason = "complete";
  while (!allDone(cards)) {
    const h = c.halt();
    if (h) { reason = h; break; }
    if (planner.stuck()) { reason = "stuck"; break; }
    if (round >= planner.maxRounds) { reason = "max-rounds"; break; }
    round++;
    const batch = planner.nextBatch(cards), ids = batch.map((b) => b.id), attempt = planner.attempt(ids);
    c.emit({ type: "info", round, cards: ids, message: `tournee ${round} : ${left(cards).length} carte(s) restante(s), lot ${ids.join(", ")}` });
    const merged = await c.impl(reportRules(batch), attempt);
    cards = await c.board();
    const bad = cards.filter((x) => ids.includes(x.id) && x.state === "preuves");
    if (!c.halt() && (!merged || bad.length)) {
      await c.corr(correctionTask(merged, bad), attempt);
      cards = await c.board();
    } else if (merged) c.emit({ type: "info", round, message: "correction ignoree : lot valide par le code (aucun appel modele)" });
    c.progress(left(cards).length);
    planner.observe(cards);
    const anomalies = cards.flatMap((x) => (x.anomalies ?? []).map((a) => `${x.id} : ${a}`));
    if (anomalies.length) c.emit({ type: "info", round, message: `anomalies (${anomalies.length}) : ${anomalies.slice(0, 5).join(" | ")}` });
  }
  return { complete: allDone(cards), reason, cards };
}
