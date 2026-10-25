/**
 * Agrégats pour les sous-totaux (SUM, COUNT, AVERAGE, MIN, MAX) : on accumule des nombres,
 * puis on lit le résultat en texte. Pur, sans DOM. Les textes et les vides sont ignorés.
 * Un agrégat sans nombre donne "" (moyenne, min, max) ou "0" (somme, nombre).
 */

/** Fonction d'agrégation d'un sous-total. */
export type AggFn = "SUM" | "COUNT" | "AVERAGE" | "MIN" | "MAX";

/** État d'accumulation : nombre de valeurs, somme, minimum et maximum. */
export interface Acc {
  n: number;
  sum: number;
  min: number;
  max: number;
}

/** Accumulateur vide. */
export function emptyAcc(): Acc {
  return { n: 0, sum: 0, min: Infinity, max: -Infinity };
}

/** Ajoute un nombre à l'accumulateur. */
export function addNum(acc: Acc, x: number): void {
  acc.n++;
  acc.sum += x;
  if (x < acc.min) acc.min = x;
  if (x > acc.max) acc.max = x;
}

/** Nombre lu dans une cellule (virgule décimale acceptée), ou null si ce n'est pas un nombre fini. */
export function parseNum(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Résultat texte de l'agrégat, arrondi à 15 chiffres significatifs (évite 0,30000000000000004). */
export function result(acc: Acc, fn: AggFn): string {
  if (fn === "COUNT") return String(acc.n);
  if (fn === "SUM") return clean(acc.sum);
  if (!acc.n) return "";
  if (fn === "AVERAGE") return clean(acc.sum / acc.n);
  return clean(fn === "MIN" ? acc.min : acc.max);
}

/** Nombre en texte, sans bruit de flottant. */
function clean(x: number): string {
  return String(Number(x.toPrecision(15)));
}
