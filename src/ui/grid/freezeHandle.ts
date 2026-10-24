/**
 * Freeze drag handles (Google Sheets): two bars anchored in the corner, on the current freeze lines (under
 * the frozen rows, right of the frozen columns; on the header edges when nothing is frozen). Dragging one
 * shows a guide line snapped to the nearest row/column boundary; dropping it calls `onFreeze` (back over
 * the headers = unfreeze that axis). Only rendered lines are targets, like Sheets' visible area.
 */
import { colLeft, type Freeze } from "./freeze";

/** A row or column on screen along the drag axis: index and pixel extent. */
export interface Span { i: number; start: number; end: number }

/** Count of lines to freeze for pointer position `p`: nearest boundary of `spans`, 0 up to the header end. */
export function snapCount(p: number, spans: Span[], headerEnd: number): number {
  if (p <= headerEnd) return 0;
  const sorted = [...spans].sort((a, b) => a.start - b.start);
  for (const s of sorted) if (p >= s.start && p < s.end) return p >= (s.start + s.end) / 2 ? s.i + 1 : s.i;
  const last = sorted[sorted.length - 1];
  return last && p >= last.end ? last.i + 1 : 0;
}

/** What the handles need from the grid. */
export interface HandleHooks {
  freeze: Freeze;
  widths: Record<number, number>;
  /** Visible frozen rows height in px (filtered rows excluded). */
  frozenPx: number;
  rowHeads(): Iterable<HTMLElement>;
  colHeads: HTMLElement[];
  onFreeze(f: Freeze): void;
}

/** Add the two bars to the corner of `root`. */
export function addFreezeHandles(root: HTMLElement, h: HandleHooks): void {
  const corner = root.querySelector<HTMLElement>(".dkg-corner")!;
  const bar = (axis: "rows" | "cols"): void => {
    const el = document.createElement("div");
    el.className = `dkg-fz dkg-fz--${axis}`;
    el.title = axis === "rows" ? "Glisser pour figer des lignes" : "Glisser pour figer des colonnes";
    if (axis === "rows") el.style.top = `calc(var(--col-header-h) + ${h.frozenPx}px)`;
    else el.style.left = colLeft(h.freeze.cols, h.widths);
    el.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation(); // not a corner click (select all)
      drag(axis);
    });
    corner.appendChild(el);
  };
  const drag = (axis: "rows" | "cols"): void => {
    const rows = axis === "rows";
    const guide = document.createElement("div");
    guide.className = `dkg-fz-guide dkg-fz-guide--${axis}`;
    let count = rows ? h.freeze.rows : h.freeze.cols;
    let moved = false;
    const move = (m: MouseEvent): void => {
      moved = true;
      const heads = rows ? [...h.rowHeads()] : h.colHeads;
      const spans = heads.map((e) => {
        const r = e.getBoundingClientRect();
        return { i: Number(rows ? e.dataset.row : e.dataset.col), start: rows ? r.top : r.left, end: rows ? r.bottom : r.right };
      });
      const c = corner.getBoundingClientRect();
      count = snapCount(rows ? m.clientY : m.clientX, spans, rows ? c.bottom : c.right);
      const edge = count === 0 ? (rows ? c.bottom : c.right) : spans.find((s) => s.i === count - 1)?.end ?? (rows ? m.clientY : m.clientX);
      const g = root.getBoundingClientRect();
      if (rows) Object.assign(guide.style, { top: `${edge - 1}px`, left: `${g.left}px`, width: `${root.clientWidth || g.width}px` });
      else Object.assign(guide.style, { left: `${edge - 1}px`, top: `${g.top}px`, height: `${root.clientHeight || g.height}px` });
      if (!guide.isConnected) root.appendChild(guide);
    };
    const up = (): void => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      guide.remove();
      const next = rows ? { rows: count, cols: h.freeze.cols } : { rows: h.freeze.rows, cols: count };
      if (moved && (next.rows !== h.freeze.rows || next.cols !== h.freeze.cols)) h.onFreeze(next);
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  };
  bar("rows");
  bar("cols");
}
