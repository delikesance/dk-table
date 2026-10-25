/**
 * Croissance des lignes d'une feuille (pur, sans DOM) : pas de plafond de lignes.
 * La feuille garde toujours un bloc de ROW_STEP lignes libres après sa dernière ligne utilisée ;
 * elle grandit par blocs quand on écrit près de la fin. Ne rétrécit jamais.
 * Usage : `rowsNeeded(lastUsedRow(keys), sheet.rows)`.
 */
import { parseKey } from "./address";

/** Taille d'un bloc de lignes (ajouté dès que la réserve de lignes libres est épuisée). */
export const ROW_STEP = 1000;

/** Numéro de la plus grande ligne contenant une cellule (clés A1). 0 si aucune. */
export function lastUsedRow(keys: Iterable<string>): number {
  let last = 0;
  for (const k of keys) {
    const p = parseKey(k);
    if (p && p.row > last) last = p.row;
  }
  return last;
}

/** Nombre de lignes à donner à la feuille : un multiple de ROW_STEP couvrant la dernière ligne utilisée + une réserve. */
export function rowsNeeded(lastUsed: number, current: number): number {
  const target = Math.ceil((lastUsed + ROW_STEP) / ROW_STEP) * ROW_STEP;
  return Math.max(current, target);
}
