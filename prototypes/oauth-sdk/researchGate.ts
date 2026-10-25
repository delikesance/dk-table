/**
 * Porte de la recherche : inutile (donc sautee) quand le moodboard a deja assez de cartes non terminees.
 *
 * Quoi : `researchGate({ unfinished, env, emit, budget })` -> vrai si la recherche est sautee (evenements start/info/end emis).
 * Pourquoi : la recherche coute ~4 EUR par run et ne sert qu'a alimenter des cartes; tant qu'il en reste `BOUCLE_RESEARCH_MIN` (defaut 12),
 *        l'implementation a de quoi travailler.
 * Usage : `if (await researchGate(...)) { /* pas de recherche *\/ }`.
 */
import type { Budget } from "./budget";
import type { BoucleEvent } from "./server";

/** Cartes non terminees a partir desquelles on saute la recherche. */
export const RESEARCH_MIN = 12;

/** Dependances de la porte. */
export interface GateDeps {
  /** Nombre de cartes non terminees (absent: la recherche tourne toujours). */
  unfinished?: () => Promise<number>;
  env?: Record<string, string>;
  emit: (e: BoucleEvent) => void;
  budget: Budget;
}

/** Vrai si la recherche est sautee. */
export async function researchGate(d: GateDeps): Promise<boolean> {
  if (!d.unfinished) return false;
  const min = Math.max(1, Math.floor(Number(d.env?.BOUCLE_RESEARCH_MIN)) || RESEARCH_MIN);
  const left = await d.unfinished();
  if (left < min) return false;
  d.emit({ type: "start", sector: "research" });
  d.emit({ type: "info", sector: "research", message: `recherche ignoree : ${left} carte(s) non terminee(s) (seuil ${min}), aucun appel modele` });
  d.emit({ type: "end", sector: "research", costUsd: 0, elapsedS: 0, totalUsd: d.budget.spent(), remainingUsd: d.budget.left(), ok: true });
  return true;
}
