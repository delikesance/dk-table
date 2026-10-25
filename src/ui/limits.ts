/**
 * Limites visibles : on avertit (toast) quand une limite est atteinte, jamais de troncature silencieuse.
 * Pas de plafond de lignes : la grille virtualise toutes les lignes (MAX_ROWS n'est qu'un plancher initial).
 * Limites : 50 000 caractères par cellule, import volumineux (> IMPORT_WARN_CELLS cellules).
 * Le poids du classeur est affiché en continu par la barre d'état (`statusbar/weightBadge.ts`).
 */
import { showToast } from "./toast/toast";

/** Longueur maximale d'une cellule (comme Google Sheets). */
export const MAX_CELL_CHARS = 50_000;
/** Au-delà de ce nombre de cellules, un import est signalé comme volumineux. */
export const IMPORT_WARN_CELLS = 200_000;

/** Avertit sans fermer vite : l'utilisateur doit pouvoir lire. */
function warn(message: string): void { showToast({ message, duration: 8000 }); }

/**
 * Vérifie des cellules écrites (clé A1 -> brut) : cellule trop longue (non tronquée, seul un avertissement).
 * Les données ne sont pas modifiées. Retourne vrai si un avertissement a été affiché.
 */
export function checkCells(cells: Record<string, string>): boolean {
  const long = Object.entries(cells).find(([, raw]) => raw.length > MAX_CELL_CHARS)?.[0];
  if (!long) return false;
  warn(`${long} dépasse ${MAX_CELL_CHARS.toLocaleString("fr-FR")} caractères (non tronquée, lenteurs possibles)`);
  return true;
}

/** Vérifie un import (CSV) : import volumineux (> IMPORT_WARN_CELLS cellules), cellules trop longues. Retourne vrai si avertissement. */
export function checkImport(s: { cols: number; rows: number; cells: Record<string, { raw: string }> }): boolean {
  const msgs: string[] = [];
  const n = Object.keys(s.cells).length;
  if (n > IMPORT_WARN_CELLS) msgs.push(`import volumineux : ${n.toLocaleString("fr-FR")} cellules`);
  const long = Object.entries(s.cells).find(([, v]) => v.raw.length > MAX_CELL_CHARS);
  if (long) msgs.push(`${long[0]} dépasse ${MAX_CELL_CHARS.toLocaleString("fr-FR")} caractères`);
  if (msgs.length) warn(msgs.join(". "));
  return msgs.length > 0;
}
