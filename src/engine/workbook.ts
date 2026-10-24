/**
 * Workbook-level recalculation: binds named sheets together (qualified refs `Feuille2!A1`)
 * and propagates an edit on one sheet to formulas of other sheets that read it.
 * Cross-sheet cycles are detected on the DFS path and set to #CYCLE! (each cell marked once).
 */
import { err, type Sheet, type Value } from "./types";
import { parseKey } from "./address";
import { attachBook, bookOf, sheetName, type NamedSheet } from "./book";
import { getState, type XDep } from "./state";
import { recalc } from "./recalc";

export type { NamedSheet };

/** One propagation run: current DFS path and cells already marked #CYCLE!. */
interface Run {
  path: Array<[Sheet, string]>;
  marked: Map<Sheet, Set<string>>;
}

/** True when `key` lies inside the rectangle of `x`. */
function inside(x: XDep, key: string): boolean {
  const p = parseKey(key), a = parseKey(x.a), b = parseKey(x.b);
  if (!p || !a || !b) return false;
  return p.col >= Math.min(a.col, b.col) && p.col <= Math.max(a.col, b.col)
    && p.row >= Math.min(a.row, b.row) && p.row <= Math.max(a.row, b.row);
}

/** Recompute formulas of every sheet of the workbook that read one of `changed` on `src`. */
function propagate(src: Sheet, changed: Set<string>, run: Run): void {
  const name = sheetName(src);
  const book = bookOf(src);
  if (!name || !book) return;
  for (const { sheet } of book.list()) {
    for (const [key, xs] of [...getState(sheet).xprec]) {
      if (!xs.some((x) => x.sheet === name && [...changed].some((k) => inside(x, k)))) continue;
      if (run.marked.get(sheet)?.has(key)) continue;
      let fixed: Value | undefined;
      if (run.path.some(([s, k]) => s === sheet && k === key)) {
        fixed = err("#CYCLE!");
        if (!run.marked.has(sheet)) run.marked.set(sheet, new Set());
        run.marked.get(sheet)!.add(key);
      }
      const affected = recalc(sheet, key, fixed);
      run.path.push([sheet, key]);
      propagate(sheet, affected, run);
      run.path.pop();
    }
  }
}

/**
 * Recalculate `key` on `sheet` (and its local dependents), then every dependent
 * formula on the other sheets of its workbook. Used by `setCell`.
 */
export function recalcBook(sheet: Sheet, key: string): void {
  const affected = recalc(sheet, key);
  propagate(sheet, affected, { path: [[sheet, key]], marked: new Map() });
}

/**
 * Bind sheets into one workbook. `list` is read on every lookup (names are
 * case-insensitive; renames/removals apply, a missing sheet gives #REF!).
 * Call again after sheets are added/replaced/renamed: every formula with a
 * qualified ref is recomputed, with cross-sheet propagation.
 */
export function bindWorkbook(list: () => NamedSheet[]): void {
  attachBook({ list });
  for (const { sheet } of list())
    for (const key of [...getState(sheet).xprec.keys()]) recalcBook(sheet, key);
}
