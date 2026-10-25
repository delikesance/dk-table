/**
 * Fonctions à résultat matriciel (débordement) : SPLIT, UNIQUE, FILTER, SORT.
 * Chaque fonction reçoit ses arguments évalués (plages en lignes `Value[][]`, scalaires tels quels)
 * et renvoie une matrice ou une erreur ; `spill.ts` la déverse dans la feuille.
 */
import { err, isErr, type CellError, type Value } from "./types";
import { toBool, toNum, toText } from "./values";

/** Argument évalué : scalaire ou matrice de lignes. */
export type SArg = Value | Value[][];
/** Résultat d'une fonction de débordement. */
export type SpillResult = Value[][] | CellError;

/** Argument en matrice (un scalaire devient 1x1). */
function mat(a: SArg | undefined): Value[][] {
  if (a === undefined) return [];
  return Array.isArray(a) ? a : [[a]];
}

/** Argument en scalaire (matrice -> première cellule). */
function scalar(a: SArg | undefined, dflt: Value): Value {
  if (a === undefined) return dflt;
  return Array.isArray(a) ? (a[0]?.[0] ?? "") : a;
}

/** Première erreur d'une matrice, sinon undefined. */
function firstErr(m: Value[][]): CellError | undefined {
  for (const r of m) for (const v of r) if (isErr(v)) return v;
}

/** SPLIT(texte; séparateur) : une ligne de morceaux ; séparateur littéral (défaut " "). */
function split(args: SArg[]): SpillResult {
  const t = scalar(args[0], "");
  const d = scalar(args[1], " ");
  if (isErr(t)) return t;
  if (isErr(d)) return d;
  const sep = toText(d);
  return [sep === "" ? [toText(t)] : toText(t).split(sep)];
}

/** UNIQUE(plage) : lignes distinctes (texte insensible à la casse), ordre d'apparition. */
function unique(args: SArg[]): SpillResult {
  const m = mat(args[0]);
  const e = firstErr(m);
  if (e) return e;
  const seen = new Set<string>();
  const out = m.filter((r) => {
    const k = JSON.stringify(r.map((v) => (typeof v === "string" ? v.toLowerCase() : v)));
    return seen.has(k) ? false : (seen.add(k), true);
  });
  return out.length ? out : err("#N/A");
}

/** FILTER(plage; condition) : lignes dont la condition (colonne de booléens/nombres) est vraie ; aucune -> #N/A. */
function filter(args: SArg[]): SpillResult {
  const m = mat(args[0]);
  const c = mat(args[1]);
  if (args.length < 2 || !m.length) return err("#VALUE!");
  const e = firstErr(m) ?? firstErr(c);
  if (e) return e;
  if (c.length !== m.length && c.length !== 1) return err("#VALUE!");
  const out = m.filter((_, i) => {
    const b = toBool(c.length === 1 ? c[0][i] ?? c[0][0] : c[i][0]);
    return b === true;
  });
  return out.length ? out : err("#N/A");
}

/** Ordre croissant : nombres < textes < booléens, vide en dernier. */
function cmp(a: Value, b: Value): number {
  const rk = (v: Value) => (v === "" ? 3 : typeof v === "number" ? 0 : typeof v === "string" ? 1 : 2);
  if (rk(a) !== rk(b)) return rk(a) - rk(b);
  if (typeof a === "string") return a.toLowerCase().localeCompare((b as string).toLowerCase());
  return Number(a) - Number(b);
}

/** SORT(plage; colonne=1; croissant=VRAI) : lignes triées sur une colonne (tri stable). */
function sort(args: SArg[]): SpillResult {
  const m = mat(args[0]);
  const e = firstErr(m);
  if (e) return e;
  const col = toNum(scalar(args[1], 1));
  const asc = toBool(scalar(args[2], true));
  if (isErr(col)) return col;
  if (isErr(asc)) return asc;
  const ci = Math.trunc(col) - 1;
  if (!m.length || ci < 0 || ci >= m[0].length) return err("#VALUE!");
  return [...m].sort((x, y) => (asc ? 1 : -1) * cmp(x[ci], y[ci]));
}

/** Fonctions de débordement par nom en majuscules. */
export const SPILL_FORMS: Record<string, (args: SArg[]) => SpillResult> = {
  SPLIT: split,
  UNIQUE: unique,
  FILTER: filter,
  SORT: sort,
};
