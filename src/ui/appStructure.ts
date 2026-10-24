/**
 * Insert/delete rows or columns spanned by the selection (App API backend).
 * Cells, formulas (refs rewritten), styles and column view state (widths, filters)
 * all move together; the whole operation is ONE undo step.
 */
import { applyEdit, moveKeys, type StructEdit } from "../engine/structure";
import { shiftRules } from "../engine/cf/structure";
import { buildSheet, pushUndo } from "./model";
import { parseKey } from "./grid/keys";
import { buildGrid, viewOf } from "./appGrid";
import { setTitle, type Ctx } from "./appState";

/** Kind of structural operation exposed by the App. */
export type StructOp = "insertRows" | "deleteRows" | "insertCols" | "deleteCols";

/** Rows/cols (1-based, inclusive) spanned by the current selection. */
function span(c: Ctx): { r0: number; r1: number; c0: number; c1: number } {
  const [a, b = a] = c.grid.getSelection().split(":").map(parseKey);
  return {
    r0: Math.min(a.row, b.row) + 1, r1: Math.max(a.row, b.row) + 1,
    c0: Math.min(a.col, b.col) + 1, c1: Math.max(a.col, b.col) + 1,
  };
}

/** Edit for an operation: inserts as many lines as selected, before the first one. */
function editOf(op: StructOp, s: ReturnType<typeof span>): StructEdit {
  const rows = op.endsWith("Rows");
  const at = rows ? s.r0 : s.c0;
  const n = rows ? s.r1 - s.r0 + 1 : s.c1 - s.c0 + 1;
  return { axis: rows ? "row" : "col", at, n: op.startsWith("insert") ? n : -n };
}

/** Shift a 0-based column-indexed map (grid widths/filters) for a column edit. */
function shiftCols<T>(map: Record<number, T>, e: StructEdit): Record<number, T> {
  const out: Record<number, T> = {};
  const end = e.at - e.n - 1;
  for (const [k, v] of Object.entries(map)) {
    const line = Number(k) + 1;
    if (line < e.at) out[line - 1] = v;
    else if (e.n > 0) out[line - 1 + e.n] = v;
    else if (line > end) out[line - 1 + e.n] = v;
  }
  return out;
}

/** Apply a structural operation on the active sheet as one undo step, then rebuild the grid. */
export function structOp(c: Ctx, op: StructOp): void {
  const e = editOf(op, span(c));
  pushUndo(c.cur);
  const raws: Record<string, string> = {};
  for (const [k, cell] of Object.entries(c.cur.sheet.cells)) raws[k] = cell.raw;
  const next = applyEdit(raws, e);
  const snap = Object.fromEntries(Object.entries(next).map(([k, raw]) => [k, { raw }]));
  c.cur.sheet = buildSheet(snap, c.cur.sheet.cols, c.cur.sheet.rows);
  c.cur.styles = moveKeys(c.cur.styles, e);
  c.cur.cf = shiftRules(c.cur.cf, e);
  if (e.axis === "col") {
    const v = viewOf(c.cur);
    v.widths = shiftCols(v.widths, e);
    v.filters = shiftCols(v.filters, e);
  }
  buildGrid(c);
  setTitle(c, true);
}
