/**
 * Cell borders: turns a selection-level mode (« Bordures ») into per-cell edges.
 * Edges are stored per cell (`CellStyle.borders`), so "outer" only marks the
 * cells on the rectangle's perimeter, on their outside sides.
 */
import { parseKey } from "../engine/address";
import type { Borders } from "../io/types";

/** Border modes offered in the toolbar menu and the palette. */
export type BorderMode = "all" | "outer" | "bottom" | "none";

/** Menu/palette labels of each mode (French UI). */
export const BORDER_LABELS: [BorderMode, string][] = [
  ["all", "Toutes"], ["outer", "Contour"], ["bottom", "Bas"], ["none", "Aucune"],
];

/**
 * New `borders` value for each affected key (`undefined` = clear). Keys absent
 * from the result are untouched. "outer"/"bottom" add to the existing edges
 * (`current`), "all" sets the four edges, "none" clears every selected cell.
 */
export function borderEdges(
  mode: BorderMode, keys: string[], current: (k: string) => Borders | undefined,
): Record<string, Borders | undefined> {
  const out: Record<string, Borders | undefined> = {};
  if (!keys.length) return out;
  const pos = keys.map((k) => parseKey(k) ?? { col: 0, row: 0 });
  const top = Math.min(...pos.map((p) => p.row)), bottom = Math.max(...pos.map((p) => p.row));
  const left = Math.min(...pos.map((p) => p.col)), right = Math.max(...pos.map((p) => p.col));
  keys.forEach((k, i) => {
    const { row, col } = pos[i];
    if (mode === "none") { out[k] = undefined; return; }
    if (mode === "all") { out[k] = { t: true, r: true, b: true, l: true }; return; }
    const add: Borders = {};
    if (row === bottom) add.b = true;
    if (mode === "outer") {
      if (row === top) add.t = true;
      if (col === left) add.l = true;
      if (col === right) add.r = true;
    }
    if (Object.keys(add).length) out[k] = { ...current(k), ...add };
  });
  return out;
}
