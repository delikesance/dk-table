/**
 * Frozen panes ("Figer les volets"): pure layout math (no DOM).
 * Frozen rows/cols are made `position: sticky`; their offsets are CSS variables set on the grid root
 * (`--dkg-t<r>` top of frozen row r, `--dkg-l<c>` left of frozen column c) plus scroll-padding so that
 * scrollIntoView keeps the active cell out from under the frozen band.
 */
import { ROW_H, scrollToRow } from "./virtual";

/** Number of frozen rows (from the top) and columns (from the left); 0 = none. */
export interface Freeze { rows: number; cols: number }

/** Normalized freeze: integers in [0, total-1] (at least one row/col stays scrollable). */
export function clampFreeze(f: Partial<Freeze> | undefined, cols: number, rows: number): Freeze {
  const fix = (v: unknown, max: number): number =>
    typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(max, Math.floor(v))) : 0;
  return { rows: fix(f?.rows, rows - 1), cols: fix(f?.cols, cols - 1) };
}

/** CSS `left` of column `col`: row header plus the widths of the columns before it. */
export function colLeft(col: number, widths: Record<number, number>): string {
  let px = 0, n = 0;
  for (let c = 0; c < col; c++) {
    if (widths[c]) px += widths[c];
    else n++;
  }
  const terms = ["var(--row-header-w)"];
  if (n) terms.push(`var(--cell-w) * ${n}`);
  if (px) terms.push(`${px}px`);
  return terms.length === 1 ? terms[0] : `calc(${terms.join(" + ")})`;
}

/** Height (px) of the frozen rows that are not hidden by a filter. */
export function frozenPx(f: Freeze, hidden: (row: number) => boolean): number {
  let n = 0;
  for (let r = 0; r < f.rows; r++) if (!hidden(r)) n++;
  return n * ROW_H;
}

/** CSS custom properties / scroll paddings to set on the grid root for freeze `f`. */
export function freezeVars(f: Freeze, widths: Record<number, number>, hidden: (row: number) => boolean): Record<string, string> {
  const out: Record<string, string> = {};
  let y = 0;
  for (let r = 0; r < f.rows; r++) {
    out[`--dkg-t${r}`] = `calc(var(--col-header-h) + ${y}px)`;
    if (!hidden(r)) y += ROW_H;
  }
  for (let c = 0; c < f.cols; c++) out[`--dkg-l${c}`] = colLeft(c, widths);
  out["scroll-padding-top"] = `calc(var(--col-header-h) + ${y}px)`;
  out["scroll-padding-left"] = colLeft(f.cols, widths);
  return out;
}

/** Frozen rows that must stay rendered whatever the scroll (skipping filtered-out rows). */
export function pinnedRows(f: Freeze, order: number[] | null): number[] {
  const all = Array.from({ length: f.rows }, (_, r) => r);
  if (!order) return all;
  const shown = new Set(order);
  return all.filter((r) => shown.has(r));
}

/**
 * scrollTop that shows visible-row index `idx` below `frozen` visible frozen rows
 * (frozen rows themselves never scroll).
 */
export function revealTop(idx: number, frozen: number, scrollTop: number, viewportH: number): number {
  if (idx < frozen) return scrollTop;
  return scrollToRow(idx - frozen, scrollTop, viewportH, ROW_H, (1 + frozen) * ROW_H);
}
