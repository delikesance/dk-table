/** Pure row-virtualization math for the grid (no DOM). */

/** Default grid height in rows (total height is simulated by CSS grid tracks, not DOM). */
export const MAX_ROWS = 1000;
/** Default row height in px (matches --cell-h). */
export const ROW_H = 28;
/** Default extra rows rendered above and below the viewport. */
export const OVERSCAN = 10;

/** Half-open row range [start, end). */
export interface RowRange { start: number; end: number }

/**
 * Rows to render for a scroll position: visible rows plus `overscan` on each side,
 * clamped to [0, total]. Out-of-range scroll values are clamped.
 */
export function visibleRange(scrollTop: number, viewportH: number, rowH: number, total: number, overscan: number): RowRange {
  if (total <= 0 || rowH <= 0) return { start: 0, end: 0 };
  const top = Math.max(0, scrollTop);
  const first = Math.floor(top / rowH);
  const last = Math.ceil((top + Math.max(0, viewportH)) / rowH);
  const start = Math.min(total, Math.max(0, first - overscan));
  const end = Math.max(start, Math.min(total, last + overscan));
  return { start, end };
}

/** New scrollTop that brings `row` fully into a viewport whose first `headerH` px are covered by headers. */
export function scrollToRow(row: number, scrollTop: number, viewportH: number, rowH: number, headerH = rowH): number {
  const top = row * rowH;
  if (top < scrollTop) return top;
  const bottom = top + rowH - (viewportH - headerH);
  return bottom > scrollTop ? bottom : scrollTop;
}
