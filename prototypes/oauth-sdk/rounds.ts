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
import type { BoardCard } from "./cards";

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
