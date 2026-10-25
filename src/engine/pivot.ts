/**
 * Tableau croisé dynamique simplifié (module pur, sans moteur ni UI).
 * Entrée : table de chaînes brutes, 1re ligne = en-têtes. Sortie : grille de chaînes
 * (en-têtes, une ligne par clé de ligne triée, ligne « Total »), prête à devenir une feuille.
 */
import { evalCalc } from "./pivotCalc";

/** Agrégation d'une cellule du croisé. */
export type PivotAgg = "SUM" | "COUNT" | "AVG";

/** Paramètres : champs par nom d'en-tête ; `calc` définit le champ `value` par expression. */
export interface PivotSpec {
  row: string;
  col?: string;
  value: string;
  agg: PivotAgg;
  calc?: { name: string; expr: string };
}

const num = (s: string): number | null => {
  const t = s.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

/** Accumulateur d'une cellule : somme et nombre de valeurs numériques, nombre de valeurs non vides. */
interface Acc { sum: number; n: number; count: number }
const one = (v: number | null, nonEmpty: boolean): Acc => ({ sum: v ?? 0, n: v === null ? 0 : 1, count: nonEmpty ? 1 : 0 });
const merge = (a: Acc | undefined, b: Acc): Acc => ({ sum: (a?.sum ?? 0) + b.sum, n: (a?.n ?? 0) + b.n, count: (a?.count ?? 0) + b.count });

/** Texte d'un résultat (arrondi à 10 décimales), vide si la cellule n'existe pas. */
function out(a: Acc | undefined, agg: PivotAgg): string {
  if (!a) return "";
  const v = agg === "SUM" ? a.sum : agg === "COUNT" ? a.count : a.n ? a.sum / a.n : NaN;
  return Number.isFinite(v) ? String(Math.round(v * 1e10) / 1e10) : "";
}

/** Calcule le croisé ; `[]` si un champ est inconnu ou si l'expression est invalide. */
export function pivot(table: string[][], spec: PivotSpec): string[][] {
  const head = table[0] ?? [];
  const ri = head.indexOf(spec.row);
  const ci = spec.col === undefined ? -1 : head.indexOf(spec.col);
  const vi = head.indexOf(spec.value);
  const calc = spec.calc && spec.calc.name === spec.value ? spec.calc : undefined;
  if (ri < 0 || (spec.col !== undefined && ci < 0) || (!calc && vi < 0)) return [];
  if (calc && !Number.isFinite(evalCalc(calc.expr, Object.fromEntries(head.map((h) => [h, 1]))))) return [];
  const cells = new Map<string, Acc>(), rowT = new Map<string, Acc>(), colT = new Map<string, Acc>();
  let grand: Acc | undefined;
  for (const r of table.slice(1)) {
    let a: Acc;
    if (calc) {
      const vars: Record<string, number> = {};
      head.forEach((h, k) => { const n = num(r[k] ?? ""); if (n !== null) vars[h] = n; });
      const x = evalCalc(calc.expr, vars);
      a = one(Number.isNaN(x) ? null : x, !Number.isNaN(x));
    } else a = one(num(r[vi] ?? ""), (r[vi] ?? "").trim() !== "");
    const rk = r[ri] ?? "", ck = ci < 0 ? "" : r[ci] ?? "";
    const key = `${rk}\u0000${ck}`;
    cells.set(key, merge(cells.get(key), a));
    rowT.set(rk, merge(rowT.get(rk), a)); colT.set(ck, merge(colT.get(ck), a));
    grand = merge(grand, a);
  }
  const cmp = (a: string, b: string) => a.localeCompare(b, "fr", { numeric: true });
  const rows = [...rowT.keys()].sort(cmp), cols = ci < 0 ? [] : [...colT.keys()].sort(cmp);
  const o = (a?: Acc) => out(a, spec.agg);
  const header = ci < 0 ? [spec.row, `${spec.agg} ${spec.value}`] : [spec.row, ...cols, "Total"];
  const body = rows.map((rk) => ci < 0 ? [rk, o(rowT.get(rk))] : [rk, ...cols.map((ck) => o(cells.get(`${rk}\u0000${ck}`))), o(rowT.get(rk))]);
  const total = ci < 0 ? ["Total", o(grand)] : ["Total", ...cols.map((ck) => o(colT.get(ck))), o(grand)];
  return [header, ...body, total];
}

/** Disposition par défaut : 1re colonne non numérique en lignes, 1re numérique en valeur (SUM). */
export function defaultSpec(table: string[][]): PivotSpec | undefined {
  const head = table[0] ?? [];
  const body = table.slice(1);
  const numeric = (k: number) => body.some((r) => num(r[k] ?? "") !== null) && body.every((r) => (r[k] ?? "").trim() === "" || num(r[k]) !== null);
  const r = head.findIndex((_, k) => !numeric(k));
  const v = head.findIndex((_, k) => numeric(k));
  if (r < 0 || v < 0) return undefined;
  return { row: head[r], value: head[v], agg: "SUM" };
}
