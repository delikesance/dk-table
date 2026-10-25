/**
 * Workbook-level recalculation: binds named sheets together (qualified refs `Feuille2!A1`)
 * and propagates an edit on one sheet to formulas of other sheets that read it.
 * Cross-sheet cycles are detected on the DFS path and set to #CYCLE! (each cell marked once).
 */
import { err, type Sheet, type Value } from "./types";
import { containsKey } from "./openrange";
import { attachBook, bookOf, sheetName, type NamedSheet } from "./book";
import { getState, type XDep } from "./state";
import { gap, recalc, recalcSheet } from "./recalc";
import { calcMode } from "./calc-mode";

export type { NamedSheet };

/**
 * One propagation run: current DFS path, cells already marked #CYCLE!, and whether a
 * cross-sheet cycle was skipped (iterative mode: `converge` then settles it).
 */
interface Run {
  path: Array<[Sheet, string]>;
  marked: Map<Sheet, Set<string>>;
  cycled: boolean;
}

/** Recompute formulas of every sheet of the workbook that read one of `changed` on `src`. */
function propagate(src: Sheet, changed: Set<string>, run: Run): void {
  const name = sheetName(src);
  const book = bookOf(src);
  if (!name || !book) return;
  for (const { sheet } of book.list()) {
    for (const [key, xs] of [...getState(sheet).xprec]) {
      if (!xs.some((x) => x.sheet === name && [...changed].some((k) => containsKey(x.a, x.b, k)))) continue;
      if (run.marked.get(sheet)?.has(key)) continue;
      let fixed: Value | undefined;
      if (run.path.some(([s, k]) => s === sheet && k === key)) {
        if (calcMode().iterative) { run.cycled = true; continue; }
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
  if (propagateFrom(sheet, key)) converge(sheet);
}

/** Recalculate `key` and its dependents across the book; true when a cross-sheet cycle was skipped. */
function propagateFrom(sheet: Sheet, key: string): boolean {
  const run: Run = { path: [[sheet, key]], marked: new Map(), cycled: false };
  propagate(sheet, recalc(sheet, key), run);
  return run.cycled;
}

/**
 * Iterative mode: repeat the propagation from every cross-sheet formula of the book until the
 * largest change is below `maxChange`, or `maxIter` passes. Without convergence, keeps the last values.
 */
function converge(sheet: Sheet): void {
  const book = bookOf(sheet);
  if (!book) return;
  const { maxIter, maxChange } = calcMode();
  const cells: Array<[Sheet, string]> = book.list().flatMap(({ sheet: s }) => [...getState(s).xprec.keys()].map((k): [Sheet, string] => [s, k]));
  const read = (): Array<Value | undefined> => cells.map(([s, k]) => getState(s).values.get(k));
  for (let i = 0; i < maxIter; i++) {
    const before = read();
    for (const [s, k] of cells) propagateFrom(s, k);
    const after = read();
    let delta = 0;
    after.forEach((v, j) => { delta = Math.max(delta, gap(before[j], v)); });
    if (delta < maxChange) return;
  }
}

/**
 * Full recalculation (F9 when `all`, else "Calculer la feuille"): every formula of the sheet(s),
 * then the cross-sheet formulas are re-propagated from their sources.
 */
export function recalcWorkbook(sheet: Sheet, all: boolean): void {
  const book = bookOf(sheet);
  const sheets = all && book ? book.list().map((e) => e.sheet) : [sheet];
  for (const s of sheets) recalcSheet(s);
  for (const s of sheets) for (const key of [...getState(s).xprec.keys()]) recalcBook(s, key);
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
