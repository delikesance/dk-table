/**
 * Outils d'analyse (dialogue « Outils d'analyse… ») : statistiques descriptives, corrélation,
 * régression linéaire. Pur (sans DOM) : prend une grille de chaînes (cellules brutes), rend
 * un tableau de chaînes prêt à être écrit dans une nouvelle feuille (`outputSheet`).
 * Les calculs passent par `engine/stats/*`.
 */
import { parseRange } from "./range";
import { describeValues, isDescriptiveError, type DescriptiveStats } from "./stats/descriptive";
import { correlationMatrix } from "./stats/correlation";
import { linearRegression, isRegressionError } from "./stats/regression";
import { makeKey } from "./address";
import type { Value } from "./types";

/** Outils proposés par le dialogue. */
export type AnalysisTool = "descriptive" | "correlation" | "regression";

/** Options propres à l'outil; `x`/`y` = numéros de colonne (1-based) dans la plage. */
export interface AnalysisOptions {
  headers: boolean;
  x?: number;
  y?: number;
}

/** Résultat : tableau de chaînes (1re ligne = en-têtes) ou message d'erreur lisible. */
export type AnalysisOutput = { ok: true; table: string[][] } | { ok: false; message: string };

/** Libellés des outils, dans l'ordre du sélecteur. */
export const ANALYSIS_TOOLS: { id: AnalysisTool; label: string }[] = [
  { id: "descriptive", label: "Statistiques descriptives" },
  { id: "correlation", label: "Corrélation" },
  { id: "regression", label: "Régression linéaire" },
];

/** Libellés des indicateurs descriptifs, dans l'ordre des lignes de sortie. */
const DESCRIPTIVE_ROWS: [string, (s: DescriptiveStats) => number | null][] = [
  ["Nombre", (s) => s.count],
  ["Somme", (s) => s.sum],
  ["Moyenne", (s) => s.mean],
  ["Médiane", (s) => s.median],
  ["Mode", (s) => s.mode],
  ["Variance", (s) => s.variance],
  ["Écart-type", (s) => s.stdev],
  ["Minimum", (s) => s.min],
  ["Maximum", (s) => s.max],
  ["Étendue", (s) => s.range],
];

/** Nombre si la cellule est numérique (point ou virgule décimale), sinon le texte tel quel. */
export function parseCell(raw: string): Value {
  const t = raw.trim();
  if (/^-?\d+([.,]\d+)?$/.test(t)) return Number(t.replace(",", "."));
  return raw;
}

/** Arrondi à 6 décimales pour l'affichage d'un résultat dans la feuille. */
function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "";
  return String(Math.round(n * 1e6) / 1e6);
}

/** Sous-grille de la plage demandée ("B2:C10"); erreur si mal formée, hors feuille ou vide. */
export function analysisInput(grid: string[][], text: string): { ok: true; grid: string[][] } | { ok: false; message: string } {
  const r = parseRange(text.trim());
  if (!r) return { ok: false, message: "Plage invalide" };
  const sub = Array.from({ length: r.r2 - r.r1 + 1 }, (_, i) =>
    Array.from({ length: r.c2 - r.c1 + 1 }, (_, j) => grid[r.r1 - 1 + i]?.[r.c1 - 1 + j] ?? ""));
  if (sub.every((row) => row.every((v) => v === ""))) return { ok: false, message: "Plage vide" };
  return { ok: true, grid: sub };
}

/** Statistiques d'une colonne, ou null si l'état n'est pas calculable (erreur, aucun nombre). */
function describeOne(values: Value[]) {
  const d = describeValues(values);
  return isDescriptiveError(d) ? null : d;
}

/** Exécute l'outil sur la sous-grille (1re ligne = en-têtes si `headers`). */
export function runAnalysis(tool: AnalysisTool, grid: string[][], opts: AnalysisOptions): AnalysisOutput {
  const names = opts.headers ? grid[0] : grid[0].map((_, c) => `Colonne ${c + 1}`);
  const data = opts.headers ? grid.slice(1) : grid;
  const cols = names.map((_, c) => data.map((row) => parseCell(row[c] ?? "")));
  const numeric = cols.map((vals, c) => ({ c, vals })).filter((col) => col.vals.some((v) => typeof v === "number"));
  if (tool === "descriptive") return descriptive(names, numeric);
  if (tool === "correlation") return correlation(names, numeric);
  return regression(cols, names.length, opts);
}

/** Tableau : une colonne par variable numérique, une ligne par indicateur. */
function descriptive(names: string[], numeric: { c: number; vals: Value[] }[]): AnalysisOutput {
  if (!numeric.length) return { ok: false, message: "Aucune colonne numérique" };
  const stats = numeric.map((col) => describeOne(col.vals));
  if (stats.some((s) => s === null)) return { ok: false, message: "Erreur dans la plage" };
  const table = [["Statistique", ...numeric.map((col) => names[col.c])]];
  for (const [label, pick] of DESCRIPTIVE_ROWS) {
    table.push([label, ...stats.map((s) => fmt(pick(s as DescriptiveStats)))]);
  }
  return { ok: true, table };
}

/** Matrice de corrélation de Pearson entre les colonnes numériques (au moins deux). */
function correlation(names: string[], numeric: { c: number; vals: Value[] }[]): AnalysisOutput {
  if (numeric.length < 2) return { ok: false, message: "Il faut au moins deux colonnes numériques" };
  const m = correlationMatrix(numeric.map((col) => col.vals));
  const table = [["", ...numeric.map((col) => names[col.c])]];
  m.forEach((row, i) => table.push([names[numeric[i].c], ...row.map((v) => fmt(v))]));
  return { ok: true, table };
}

/** Régression de y (colonne `opts.y`) sur x (colonne `opts.x`). */
function regression(cols: Value[][], width: number, opts: AnalysisOptions): AnalysisOutput {
  const { x, y } = opts;
  if (!x || !y) return { ok: false, message: "Choisissez les colonnes X et Y" };
  if (x < 1 || y < 1 || x > width || y > width) return { ok: false, message: "Colonne X ou Y hors de la plage" };
  const r = linearRegression(cols[x - 1], cols[y - 1]);
  if (isRegressionError(r)) return { ok: false, message: r.message };
  return {
    ok: true,
    table: [
      ["Indicateur", "Valeur"],
      ["Pente", fmt(r.slope)],
      ["Ordonnée à l'origine", fmt(r.intercept)],
      ["R²", fmt(r.r2)],
      ["Paires", String(r.count)],
    ],
  };
}

/** Cellules persistables (clés A1) et dimensions d'un tableau de sortie. */
export function outputSheet(table: string[][]): { cols: number; rows: number; cells: Record<string, { raw: string }> } {
  const cells: Record<string, { raw: string }> = {};
  table.forEach((row, r) => row.forEach((v, c) => { if (v !== "") cells[makeKey(c + 1, r + 1)] = { raw: v }; }));
  return {
    cols: Math.max(26, ...table.map((row) => row.length)),
    rows: Math.max(100, table.length),
    cells,
  };
}
