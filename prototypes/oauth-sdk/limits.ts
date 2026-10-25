/**
 * Constantes de la boucle (une seule source; docs/boucle-optimisee.md est verifiee contre elles, voir docs.consistency.test.ts).
 *
 * Quoi : `BATCH` cartes par tournee, `PATIENCE` tournees sans avancee avant l'arret, `MAX_ROUNDS` tournees au plus,
 *        `MAX_TRIES` essais au plus par carte (au-dela: carte bloquee, plus aucun agent lance), `PARALLEL_DEFAULT` agents simultanes.
 */
export const BATCH = 6;
export const PATIENCE = 3;
export const MAX_ROUNDS = 40;
export const MAX_TRIES = 3;
export const PARALLEL_DEFAULT = 3;
