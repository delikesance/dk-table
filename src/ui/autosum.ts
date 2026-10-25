/**
 * Quick sum (Σ / Alt+=). With a multi-cell selection: one `=SUM` per column in the row below it
 * (several rows), or a single `=SUM` right of it (one row). With a single cell: sums the contiguous
 * numeric cells directly ABOVE it, else directly to its LEFT, never overwriting a filled cell: the
 * formula goes to the first empty cell below (above mode) or to the right (left mode).
 */
import { keyOf, parseKey } from "./grid/keys";
import type { App } from "./appTypes";

/** Max rows/cols scanned when looking for the first empty target cell. */
const SCAN = 1000;

/** True when `raw` is a number or a formula (counts as a numeric operand). */
const isNum = (raw: string | undefined): boolean =>
  !!raw && (raw.startsWith("=") || (raw.trim() !== "" && Number.isFinite(Number(raw))));

/** Sums an explicit selection (`A1:B3`) next to it; returns false for a single cell. */
function sumSelection(app: App, sel: string): boolean {
  const [a, b] = sel.split(":");
  if (!b || a === b) return false;
  const p = parseKey(a), q = parseKey(b);
  const [c1, c2, r1, r2] = [Math.min(p.col, q.col), Math.max(p.col, q.col), Math.min(p.row, q.row), Math.max(p.row, q.row)];
  const out: Record<string, string> = {};
  if (r1 === r2) out[keyOf(c2 + 1, r1)] = `=SUM(${keyOf(c1, r1)}:${keyOf(c2, r1)})`;
  else for (let c = c1; c <= c2; c++) out[keyOf(c, r2 + 1)] = `=SUM(${keyOf(c, r1)}:${keyOf(c, r2)})`;
  app.editMany(out);
  return true;
}

/** Applies the Σ heuristic on the selection; returns false when nothing was written. */
export function autosum(app: App): boolean {
  if (sumSelection(app, app.selection())) return true;
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
