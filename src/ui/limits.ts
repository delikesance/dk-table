/**
 * Plafonds façon Google Sheets : on avertit (toast) quand une limite est atteinte, jamais de troncature silencieuse.
 * Limites : MAX_ROWS lignes affichées, 50 000 caractères par cellule, import volumineux (> IMPORT_WARN_CELLS cellules).
 */
import { MAX_ROWS } from "./grid/virtual";
import { parseKey } from "../engine/address";
import { showToast } from "./toast/toast";

/** Longueur maximale d'une cellule (comme Google Sheets). */
export const MAX_CELL_CHARS = 50_000;
/** Au-delà de ce nombre de cellules, un import est signalé comme volumineux. */
export const IMPORT_WARN_CELLS = 200_000;

/** Avertit sans fermer vite : l'utilisateur doit pouvoir lire. */
function warn(message: string): void { showToast({ message, duration: 8000 }); }

/**
 * Vérifie des cellules écrites (clé A1 -> brut) : cellule trop longue, ligne au-delà de MAX_ROWS.
 * Les données ne sont pas modifiées. Retourne vrai si un avertissement a été affiché.
 */
export function checkCells(cells: Record<string, string>): boolean {
  let long: string | undefined, out: string | undefined;
  for (const [k, raw] of Object.entries(cells)) {
    if (!long && raw.length > MAX_CELL_CHARS) long = k;
    const p = parseKey(k);
    if (!out && p && p.row > MAX_ROWS && raw !== "") out = k;
  }
  const msgs: string[] = [];
  if (long) msgs.push(`${long} dépasse ${MAX_CELL_CHARS.toLocaleString("fr-FR")} caractères (non tronquée, lenteurs possibles)`);
  if (out) msgs.push(`${out} est au-delà de la ligne ${MAX_ROWS} : non affichée`);
  if (msgs.length) warn(msgs.join(". "));
  return msgs.length > 0;
}

/** Vérifie un import (CSV) : lignes au-delà de MAX_ROWS, cellules trop longues, taille. Retourne vrai si avertissement. */
export function checkImport(s: { cols: number; rows: number; cells: Record<string, { raw: string }> }): boolean {
  const msgs: string[] = [];
  if (s.rows > MAX_ROWS) msgs.push(`${s.rows} lignes importées, seules les ${MAX_ROWS} premières sont affichées`);
  const n = Object.keys(s.cells).length;
  if (n > IMPORT_WARN_CELLS) msgs.push(`import volumineux : ${n.toLocaleString("fr-FR")} cellules`);
  const long = Object.entries(s.cells).find(([, v]) => v.raw.length > MAX_CELL_CHARS);
  if (long) msgs.push(`${long[0]} dépasse ${MAX_CELL_CHARS.toLocaleString("fr-FR")} caractères`);
  if (msgs.length) warn(msgs.join(". "));
  return msgs.length > 0;
}
