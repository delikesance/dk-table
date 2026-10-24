/**
 * Quick sum (Σ / Alt+=): writes `=SUM(range)` using the contiguous numeric cells directly
 * ABOVE the active cell, else directly to its LEFT. Never overwrites a filled cell: the formula
 * goes to the first empty cell below (above mode) or to the right (left mode).
 */
import { keyOf, parseKey } from "./grid/keys";
import type { App } from "./appTypes";

/** Max rows/cols scanned when looking for the first empty target cell. */
const SCAN = 1000;

/** True when `raw` is a number or a formula (counts as a numeric operand). */
const isNum = (raw: string | undefined): boolean =>
  !!raw && (raw.startsWith("=") || (raw.trim() !== "" && Number.isFinite(Number(raw))));

/** Applies the Σ heuristic on the active cell; returns false when nothing was written. */
export function autosum(app: App): boolean {
  const cells = app.activeDoc().cells;
  const raw = (c: number, r: number): string | undefined => (c < 0 || r < 0 ? undefined : cells[keyOf(c, r)]?.raw);
  const { col, row } = parseKey(app.selection().split(":")[0]);
  let up = 0;
  while (isNum(raw(col, row - 1 - up))) up++;
  let left = 0;
  while (isNum(raw(col - 1 - left, row))) left++;
  if (!up && !left) return false;
  const vertical = up > 0;
  const range = vertical
    ? `${keyOf(col, row - up)}:${keyOf(col, row - 1)}`
    : `${keyOf(col - left, row)}:${keyOf(col - 1, row)}`;
  let [c, r] = [col, row];
  for (let i = 0; i < SCAN && raw(c, r); i++) vertical ? r++ : c++;
  app.edit(keyOf(c, r), `=SUM(${range})`);
  return true;
}
