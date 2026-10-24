/** Row window of the grid: creates/removes row DOM so only visible rows (+ overscan) exist. */
import { colName, keyOf } from "./keys";
import { OVERSCAN, ROW_H, visibleRange } from "./virtual";

/** Viewport height assumed when the layout reports none (e.g. jsdom). */
export const FALLBACK_VIEWPORT_H = 600;

/** Live set of rendered rows. */
export interface RowWindow {
  /** Rendered cells by key. */
  cells: Map<string, HTMLElement>;
  /** Rendered row headers by row index. */
  heads: Map<number, HTMLElement>;
  /** Re-compute the window from scroll state; `keepRow` stays rendered (editing). */
  sync(keepRow?: number): { added: number[]; removed: number[] };
}

/** Place `el` at 1-based grid row/column. */
function place(el: HTMLElement, row: number, col: number): void {
  el.style.setProperty("grid-row", String(row));
  el.style.setProperty("grid-column", String(col));
}

/** Create a div with class/text at a grid position, appended to `root`. */
function mk(root: HTMLElement, cls: string, row: number, col: number, text = ""): HTMLElement {
  const d = document.createElement("div");
  d.className = cls;
  d.textContent = text;
  place(d, row, col);
  root.appendChild(d);
  return d;
}

/** Create the window over `root`; `onCell` runs after a cell is attached. */
export function createRowWindow(root: HTMLElement, cols: number, total: number,
  onCell?: (key: string, el: HTMLElement) => void): RowWindow {
  const cells = new Map<string, HTMLElement>();
  const heads = new Map<number, HTMLElement>();

  const add = (r: number): void => {
    heads.set(r, mk(root, "dkg-rowh", r + 2, 1, String(r + 1)));
    for (let c = 0; c < cols; c++) {
      const el = mk(root, "dkg-cell", r + 2, c + 2);
      const k = keyOf(c, r);
      el.dataset.key = k;
      cells.set(k, el);
      onCell?.(k, el);
    }
  };
  const drop = (r: number): void => {
    heads.get(r)?.remove();
    heads.delete(r);
    for (let c = 0; c < cols; c++) {
      const k = keyOf(c, r);
      cells.get(k)?.remove();
      cells.delete(k);
    }
  };

  return {
    cells, heads,
    sync(keepRow) {
      const vh = root.clientHeight || FALLBACK_VIEWPORT_H;
      const { start, end } = visibleRange(root.scrollTop, vh, ROW_H, total, OVERSCAN);
      const removed = [...heads.keys()].filter((r) => (r < start || r >= end) && r !== keepRow);
      removed.forEach(drop);
      const added: number[] = [];
      for (let r = start; r < end; r++) if (!heads.has(r)) { add(r); added.push(r); }
      return { added, removed };
    },
  };
}

/** Corner plus column headers (static, grid row 1); returns the headers by column. */
export function addHeaders(root: HTMLElement, cols: number): HTMLElement[] {
  mk(root, "dkg-corner", 1, 1);
  return Array.from({ length: cols }, (_, c) => mk(root, "dkg-colh", 1, c + 2, colName(c)));
}
