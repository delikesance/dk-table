/**
 * Logique pure de filtre par colonne. Le filtre est une VUE (masque de lignes):
 * il ne modifie jamais les données ni le modèle.
 */

/** Libellé regroupant les cellules vides. */
export const EMPTY_LABEL = "(Vides)";

/** Option de filtre: valeur distincte et son nombre d'occurrences. */
export interface Distinct {
  value: string;
  count: number;
}

/** Options de calcul du masque. */
export interface MaskOptions {
  /** Si vrai, la ligne 0 n'est jamais masquée. */
  hasHeader?: boolean;
}

/** Valeur de filtre d'une cellule (vide -> EMPTY_LABEL). */
const keyOfValue = (v: string | undefined): string => (v === undefined || v === "" ? EMPTY_LABEL : v);

/**
 * Valeurs distinctes triées d'une colonne avec comptage; les vides sont
 * regroupés sous « (Vides) » (en dernier). Limité à `max` entrées.
 */
export function distinctValues(column: string[], max = 200): Distinct[] {
  const counts = new Map<string, number>();
  for (const v of column) {
    const k = keyOfValue(v);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const empty = counts.get(EMPTY_LABEL);
  counts.delete(EMPTY_LABEL);
  const out = [...counts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))
    .map(([value, count]) => ({ value, count }));
  if (empty !== undefined) out.push({ value: EMPTY_LABEL, count: empty });
  return out.slice(0, max);
}

/**
 * Masque de visibilité par ligne pour la colonne `col`.
 * `selected` null = pas de filtre (tout visible).
 */
export function buildMask(
  rows: string[][],
  col: number,
  selected: Set<string> | null,
  opts: MaskOptions = {},
): boolean[] {
  return rows.map((r, i) => {
    if (selected === null) return true;
    if (opts.hasHeader && i === 0) return true;
    return selected.has(keyOfValue(r[col]));
  });
}

/** ET logique de plusieurs masques (une ligne visible dans tous). */
export function combineMasks(masks: boolean[][]): boolean[] {
  if (masks.length === 0) return [];
  return masks[0].map((_, i) => masks.every((m) => m[i]));
}

/** Indices des lignes masquées. */
export function hiddenRows(mask: boolean[]): number[] {
  const out: number[] = [];
  mask.forEach((v, i) => {
    if (!v) out.push(i);
  });
  return out;
}
