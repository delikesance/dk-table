/**
 * Frozen panes on the grid DOM: decorates frozen cells/headers (sticky + separator classes), keeps the
 * root CSS variables in sync (column widths, filters) and scrolls the active cell into view without
 * hiding it under the frozen band. The freeze itself lives in `GridView.freeze` (fixed for a grid's life:
 * the app rebuilds the grid when it changes).
 */
import { clampFreeze, freezeVars, frozenPx, pinnedRows, revealTop } from "./freeze";
import { ROW_H } from "./virtual";
import { FALLBACK_VIEWPORT_H } from "./window";
import type { GridView } from "./types";

/** Freeze controller used by the grid. */
export interface FreezeCtl {
  /** Mark a cell (or a header: `head`, with col/row -1 for the missing axis) as frozen when it is. */
  decorate(el: HTMLElement, col: number, row: number, head?: boolean): void;
  /** Recompute sticky offsets (after a column resize or a filter change). */
  layout(): void;
  /** Frozen rows to keep rendered for the current filter order. */
  pinned(order: number[] | null): number[];
  /** Vertical scroll for the active row (visible index `idx`), before the window sync. */
  scrollRow(idx: number): void;
  /** Horizontal scroll for the active cell `el` (skipped for frozen columns), after the sync. */
  scrollCol(col: number, el: HTMLElement | undefined): void;
}

/** Create the controller for `root`; `hidden(row)` tells if a row is filtered out. */
export function createFreezeCtl(root: HTMLElement, view: GridView, cols: number, rows: number,
  hidden: (row: number) => boolean): FreezeCtl {
  const f = clampFreeze(view.freeze, cols, rows);
  const on = f.rows > 0 || f.cols > 0;
  return {
    decorate(el, col, row, head = false) {
      if (!on) return;
      const fr = row >= 0 && row < f.rows, fc = col >= 0 && col < f.cols;
      if (!fr && !fc) return;
      el.classList.add(head ? "dkg-frozen-h" : "dkg-frozen");
      if (fr) el.style.top = `var(--dkg-t${row})`;
      if (fc) el.style.left = `var(--dkg-l${col})`;
      if (fr && fc && !head) el.classList.add("dkg-frozen-x");
      if (row === f.rows - 1) el.classList.add("dkg-frozen-b");
      if (col === f.cols - 1) el.classList.add("dkg-frozen-r");
    },
    layout() {
      if (!on) return;
      for (const [k, v] of Object.entries(freezeVars(f, view.widths, hidden))) root.style.setProperty(k, v);
    },
    pinned: (order) => (on ? pinnedRows(f, order) : []),
    scrollRow(idx) {
      const vh = root.clientHeight || FALLBACK_VIEWPORT_H;
      const st = revealTop(idx, frozenPx(f, hidden) / ROW_H, root.scrollTop, vh);
      if (st !== root.scrollTop) root.scrollTop = st;
    },
    scrollCol(col, el) {
      if (col < f.cols) return; // frozen column: always visible horizontally
      (el as HTMLElement & { scrollIntoView?: Function } | undefined)
        ?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
    },
  };
}
