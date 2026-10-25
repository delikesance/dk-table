/**
 * Plan (outline) of a sheet: rows and columns each keep their own levels and folded state.
 * Pure (no DOM). Wraps the per-axis model of `outline.ts`; the axis index is the 0-based row or
 * column number. Collapsing a row group never touches the column folds, and the reverse.
 */
import {
  emptyOutline,
  setLevel,
  collapse,
  expand,
  showLevel,
  hiddenRows as hiddenIndexes,
  type Outline,
} from "./outline";

/** Outline of a sheet: `rows` for row levels and folds, `cols` for column levels and folds. */
export interface SheetOutline {
  rows: Outline;
  cols: Outline;
}

/** Outline of a sheet of `rows` rows and `cols` columns, all at level 0 and expanded. */
export function emptySheetOutline(rows: number, cols: number): SheetOutline {
  return { rows: emptyOutline(rows), cols: emptyOutline(cols) };
}

/** Set the level of a row (0 to MAX_LEVEL). Throws RangeError on a bad level or row. */
export function setRowLevel(s: SheetOutline, row: number, level: number): SheetOutline {
  return { ...s, rows: setLevel(s.rows, row, level) };
}

/** Set the level of a column (0 to MAX_LEVEL). Throws RangeError on a bad level or column. */
export function setColLevel(s: SheetOutline, col: number, level: number): SheetOutline {
  return { ...s, cols: setLevel(s.cols, col, level) };
}

/** Collapse the row group of `summary`. */
export function collapseRow(s: SheetOutline, summary: number): SheetOutline {
  return { ...s, rows: collapse(s.rows, summary) };
}

/** Collapse the column group of `summary`. */
export function collapseCol(s: SheetOutline, summary: number): SheetOutline {
  return { ...s, cols: collapse(s.cols, summary) };
}

/** Expand the row group of `summary`. */
export function expandRow(s: SheetOutline, summary: number): SheetOutline {
  return { ...s, rows: expand(s.rows, summary) };
}

/** Expand the column group of `summary`. */
export function expandCol(s: SheetOutline, summary: number): SheetOutline {
  return { ...s, cols: expand(s.cols, summary) };
}

/** Show row levels 0 to `n` (deeper rows folded). */
export function showRowLevel(s: SheetOutline, n: number): SheetOutline {
  return { ...s, rows: showLevel(s.rows, n) };
}

/** Show column levels 0 to `n` (deeper columns folded). */
export function showColLevel(s: SheetOutline, n: number): SheetOutline {
  return { ...s, cols: showLevel(s.cols, n) };
}

/** Row indexes hidden by the folds. */
export function hiddenRows(s: SheetOutline): Set<number> {
  return hiddenIndexes(s.rows);
}

/** Column indexes hidden by the folds. */
export function hiddenCols(s: SheetOutline): Set<number> {
  return hiddenIndexes(s.cols);
}
