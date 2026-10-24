/**
 * Mouse selection of the grid: click/drag on cells (Shift extends), whole columns/rows from their
 * headers (click, Shift+click, drag over headers or cells, like Excel), whole sheet from the corner.
 * Header selections are plain rectangles (A1:A1000), so formatting, copy, delete and stats need nothing new.
 */
import { parseKey, type Pos } from "./keys";
import type { Sel } from "./nav";

/** What the pointer is on. */
type Hit = { kind: "cell"; pos: Pos } | { kind: "col" | "row"; i: number } | { kind: "all" };

/** Hooks into the grid state. */
export interface MouseHooks {
  cols: number;
  rows: number;
  sel(): Sel;
  /** Apply a selection; `reveal` scrolls the cursor into view (off for headers: no jump). */
  set(s: Sel, reveal: boolean): void;
  /** True when `el` is inside the open editor (the click belongs to it). */
  inEditor(el: Element): boolean;
  endEdit(): void;
  startEdit(): void;
}

/** Selection spanning whole columns (`kind` col) or rows between headers `from` and `to`; cursor on the first row/column. */
export function headerSel(kind: "col" | "row", from: number, to: number, cols: number, rows: number): Sel {
  return kind === "col"
    ? { anchor: { col: from, row: rows - 1 }, active: { col: to, row: 0 } }
    : { anchor: { col: cols - 1, row: from }, active: { col: 0, row: to } };
}

/** Target of a mouse event; resizers and filter buttons inside headers are not targets. */
function hit(target: EventTarget | null): Hit | null {
  const el = target as HTMLElement;
  if (!el?.closest || el.closest(".dkg-resizer, .dkg-filter")) return null;
  const t = el.closest<HTMLElement>(".dkg-cell, .dkg-colh, .dkg-rowh, .dkg-corner");
  if (!t) return null;
  if (t.classList.contains("dkg-cell")) return { kind: "cell", pos: parseKey(t.dataset.key!) };
  if (t.classList.contains("dkg-corner")) return { kind: "all" };
  return t.classList.contains("dkg-colh") ? { kind: "col", i: Number(t.dataset.col) } : { kind: "row", i: Number(t.dataset.row) };
}

/** Bind mouse selection on `root`; returns the cleanup (document listener). */
export function bindMouse(root: HTMLElement, h: MouseHooks): () => void {
  let drag: { kind: "cell" } | { kind: "col" | "row"; from: number } | null = null;
  const span = (kind: "col" | "row", from: number, to: number): void => h.set(headerSel(kind, from, to, h.cols, h.rows), false);

  root.addEventListener("mousedown", (e) => {
    const t = hit(e.target);
    if (!t || h.inEditor(e.target as Element)) return;
    h.endEdit();
    const { anchor } = h.sel();
    if (t.kind === "cell") {
      h.set({ anchor: e.shiftKey ? anchor : t.pos, active: t.pos }, true);
      drag = { kind: "cell" };
    } else if (t.kind === "all") {
      h.set({ anchor: { col: h.cols - 1, row: h.rows - 1 }, active: { col: 0, row: 0 } }, false);
    } else {
      e.preventDefault(); // no text selection while dragging over headers
      const from = e.shiftKey ? (t.kind === "col" ? anchor.col : anchor.row) : t.i;
      span(t.kind, from, t.i);
      drag = { kind: t.kind, from };
    }
    root.focus();
  });
  root.addEventListener("mouseover", (e) => {
    const t = drag && hit(e.target);
    if (!drag || !t) return;
    if (drag.kind === "cell") {
      if (t.kind === "cell") h.set({ anchor: h.sel().anchor, active: t.pos }, true);
      return;
    }
    const to = t.kind === "cell" ? t.pos[drag.kind] : t.kind === drag.kind ? t.i : null;
    if (to !== null) span(drag.kind, drag.from, to);
  });
  root.addEventListener("dblclick", (e) => {
    if ((e.target as HTMLElement).closest(".dkg-cell")) h.startEdit();
  });
  const onUp = (): void => { drag = null; };
  document.addEventListener("mouseup", onUp);
  return () => document.removeEventListener("mouseup", onUp);
}
