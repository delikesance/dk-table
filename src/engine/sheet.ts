import type { Sheet, Value } from "./types";
import { isErr } from "./types";
import { expandRange, inBounds, normKey } from "./address";
import { getState, recalc, rewire } from "./recalc";
import { displayValue } from "./values";

export type { Sheet, Cell, Value, CellError, ErrorCode } from "./types";
export { registerFunction } from "./functions";

/** Create an empty default sheet (26 columns x 100 rows). */
export function createSheet(): Sheet {
  return { cols: 26, rows: 100, cells: {} };
}

/**
 * Set a cell's raw input ("" clears it; "=..." is a formula) and
 * automatically recalculate it and all its dependents. Out-of-bounds keys are ignored.
 */
export function setCell(sheet: Sheet, key: string, raw: string): void {
  key = normKey(key);
  if (!inBounds(sheet, key)) return;
  if (raw === "") delete sheet.cells[key];
  else sheet.cells[key] = { raw };
  rewire(sheet, key);
  recalc(sheet, key);
}

/** Raw user input of a cell ("" if empty). */
export function getRaw(sheet: Sheet, key: string): string {
  return sheet.cells[normKey(key)]?.raw ?? "";
}

/** Computed value of a cell: number | string | boolean | {error} ("" if empty). */
export function getValue(sheet: Sheet, key: string): Value {
  return getState(sheet).values.get(normKey(key)) ?? "";
}

/** Computed value as display text (errors as "#DIV/0!", booleans as TRUE/FALSE). */
export function getDisplay(sheet: Sheet, key: string): string {
  return displayValue(getValue(sheet, key));
}

/**
 * Numeric values of a range like "A1:A5", row-major; non-numeric and empty
 * cells are skipped. Invalid/out-of-bounds range or errors yield [].
 */
export function getRangeValues(sheet: Sheet, range: string): number[] {
  const [a, b = a] = range.toUpperCase().split(":");
  const keys = expandRange(sheet, a, b) ?? [];
  const out: number[] = [];
  for (const k of keys) {
    const v = getValue(sheet, k);
    if (typeof v === "number") out.push(v);
    else if (isErr(v)) return [];
  }
  return out;
}
