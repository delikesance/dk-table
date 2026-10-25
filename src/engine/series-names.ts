/** Listes cycliques françaises pour la recopie de séries: mois et jours (complets et abréviés). */

/** Listes de noms; la première qui contient toutes les valeurs sources est utilisée (jours avant mois pour « mar »). */
export const NAME_LISTS: readonly (readonly string[])[] = [
  ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"],
  ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."],
  ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"],
  ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
  ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."],
  ["jan", "fév", "mar", "avr", "mai", "jun", "jul", "aoû", "sep", "oct", "nov", "déc"],
];

/** Casse d'un mot source: TOUT EN MAJUSCULES, Capitalisé, ou minuscules. */
export function caseOf(w: string): "upper" | "title" | "lower" {
  if (w.length > 1 && w === w.toUpperCase() && w !== w.toLowerCase()) return "upper";
  return w[0] !== w[0].toLowerCase() ? "title" : "lower";
}

/** Applique une casse à `w` (minuscules en entrée). */
export function applyCase(w: string, c: "upper" | "title" | "lower"): string {
  return c === "upper" ? w.toUpperCase() : c === "title" ? w[0].toUpperCase() + w.slice(1) : w;
}

/**
 * Série de noms: `next(i)` donne le (i+1)-ième nom après la source. Pas = écart d'indices constant
 * entre valeurs consécutives (modulo la longueur de la liste), 1 pour une seule valeur.
 * Null si les valeurs ne sont pas toutes dans une même liste ou si le pas n'est pas constant.
 */
export function nameSeries(src: string[], dir = 1): { next(i: number): string; byDefault: boolean } | null {
  const low = src.map((s) => s.trim().toLowerCase());
  for (const list of NAME_LISTS) {
    const idx = low.map((w) => list.indexOf(w));
    if (idx.some((i) => i < 0)) continue;
    const L = list.length;
    const step = src.length === 1 ? (dir + L) % L : (idx[1] - idx[0] + L) % L;
    if (step === 0 || idx.some((v, k) => k > 0 && (v - idx[k - 1] + L) % L !== step)) return null;
    const c = caseOf(src[src.length - 1].trim());
    const last = idx[idx.length - 1];
    return { byDefault: true, next: (i) => applyCase(list[(((last + step * (i + 1)) % L) + L) % L], c) };
  }
  return null;
}
