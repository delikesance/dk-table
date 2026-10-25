/**
 * Plan de sous-totaux pour une feuille, pur (sans DOM ni feuille).
 * `buildSubtotalPlan(table, header, spec)` : `table` = lignes de texte de la plage ; si `header`,
 * la 1re ligne reste en tête (non triée) ; le reste passe par `subtotals()` (engine/subtotals.ts).
 * Niveaux du plan (engine/outline.ts) : données = nombre de colonnes de groupe (0 = pas de groupe),
 * sous-total du niveau l = l, total général = 0. Ainsi replier un sous-total masque ses données.
 * Usage : `const { rows, levels } = buildSubtotalPlan(table, true, { groups: [0], values: [1], fn: "SUM" })`.
 */
import { subtotals, type SubSpec } from "./subtotals";

/** Lignes de sortie (à écrire dans la feuille) et niveau de chaque ligne du plan. */
export interface SubtotalPlan {
  rows: string[][];
  levels: number[];
}

/** Lignes de sous-totaux à partir de `table` (en-tête gardé si `header`) et du plan associé. */
export function buildSubtotalPlan(table: string[][], header: boolean, spec: SubSpec): SubtotalPlan {
  if (!table.length) return { rows: [], levels: [] };
  const head = header ? table.slice(0, 1) : [];
  const body = header ? table.slice(1) : table;
  const out = subtotals(body, spec);
  const rows = [...head, ...out.map((r) => r.cells)];
  const dataLevel = spec.groups.length;
  const levels = [
    ...head.map(() => 0),
    ...out.map((r) => (r.kind === "data" ? dataLevel : r.kind === "sub" ? r.level : 0)),
  ];
  return { rows, levels };
}
