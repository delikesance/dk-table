/**
 * Tri de lignes d'un bloc rectangulaire de valeurs brutes (chaînes).
 * Module pur: ne touche ni au moteur ni à l'UI. Renvoie aussi la permutation
 * pour que l'appelant déplace styles et ajuste les références.
 */

/** Options de tri. */
export interface SortOptions {
  /** Index de colonne (dans le bloc) servant de clé. */
  col: number;
  /** Décroissant si vrai (les vides restent en bas). */
  desc?: boolean;
  /** Si vrai, la 1re ligne reste en place. */
  hasHeader?: boolean;
  /** Liste personnalisée: ses valeurs passent avant les autres, dans l'ordre de la liste (casse ignorée). */
  list?: string[];
}

/** Résultat: `rows[i]` = ligne d'origine `order[i]`. */
export interface SortResult {
  rows: string[][];
  order: number[];
}

/** Vrai si la cellule est vide (ou blanche). */
const isEmpty = (s: string | undefined): boolean => (s ?? '').trim() === '';

/** Nombre parsé (virgule décimale acceptée) ou null si la cellule n'est pas numérique. */
function toNumber(s: string | undefined): number | null {
  const t = (s ?? '').trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Compare deux cellules non vides en ordre croissant: nombres < texte (casse ignorée, fr). */
function compareAsc(a: string, b: string): number {
  const na = toNumber(a);
  const nb = toNumber(b);
  if (na !== null && nb !== null) return na - nb;
  if (na !== null) return -1;
  if (nb !== null) return 1;
  return a.trim().localeCompare(b.trim(), 'fr', { sensitivity: 'accent' });
}

/** Position d'une valeur dans la liste personnalisée (-1 si absente ou pas de liste). */
const listPos = (list: string[] | undefined, s: string): number =>
  list ? list.findIndex((x) => x.trim().toLowerCase() === s.trim().toLowerCase()) : -1;

/**
 * Trie les lignes de `block` selon la colonne `opts.col`.
 * Tri stable; vides toujours en bas; ne modifie pas `block`.
 */
export function sortRows(block: string[][], opts: SortOptions): SortResult {
  const start = opts.hasHeader ? 1 : 0;
  const idx = block.map((_, i) => i).slice(start);
  const sign = opts.desc ? -1 : 1;
  const key = (i: number): string | undefined => block[i][opts.col];
  idx.sort((i, j) => {
    const ei = isEmpty(key(i));
    const ej = isEmpty(key(j));
    if (ei || ej) return ei === ej ? i - j : ei ? 1 : -1;
    const a = key(i)!, b = key(j)!;
    const pa = listPos(opts.list, a), pb = listPos(opts.list, b);
    if (pa >= 0 || pb >= 0) return pa < 0 ? 1 : pb < 0 ? -1 : sign * (pa - pb) || i - j;
    return sign * compareAsc(a, b) || i - j;
  });
  const order = [...block.slice(0, start).map((_, i) => i), ...idx];
  return { rows: order.map((i) => block[i]), order };
}

/**
 * Devine si la 1re ligne est un en-tête: elle est entièrement textuelle
 * (aucune cellule vide ni numérique) ET la 2e ligne contient un nombre
 * dans une colonne dont l'en-tête est du texte. Heuristique par défaut.
 */
export function detectHeader(block: string[][]): boolean {
  if (block.length < 2) return false;
  const [first, second] = block;
  if (first.length === 0) return false;
  if (!first.every((c) => !isEmpty(c) && toNumber(c) === null)) return false;
  return first.some((_, c) => toNumber(second[c]) !== null);
}
