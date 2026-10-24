/** Selection highlight of the grid: active cell, range fill and header highlights (rendered DOM only). */
import { keyOf, type Pos } from "./keys";

/** Rendered elements the highlight is applied to. */
export interface MarkTargets {
  cells: Map<string, HTMLElement>;
  rowHeads: Map<number, HTMLElement>;
  colHeads: HTMLElement[];
}

/**
 * Clear the classes on `prev` and mark the selection `anchor`..`active` on rendered cells/headers
 * (the selection may span unrendered rows). Returns the newly marked elements.
 */
export function markSelection(prev: HTMLElement[], t: MarkTargets, anchor: Pos, active: Pos): HTMLElement[] {
  prev.forEach((e) => e.classList.remove("dkg-active", "dkg-range", "dkg-on"));
  const marked: HTMLElement[] = [];
  const add = (e: HTMLElement | undefined, cls: string) => {
    if (!e) return;
    e.classList.add(cls);
    marked.push(e);
  };
  if (anchor.col !== active.col || anchor.row !== active.row) {
    const [c0, c1] = [Math.min(anchor.col, active.col), Math.max(anchor.col, active.col)];
    const [r0, r1] = [Math.min(anchor.row, active.row), Math.max(anchor.row, active.row)];
    for (const r of t.rowHeads.keys())
      if (r >= r0 && r <= r1) for (let c = c0; c <= c1; c++) add(t.cells.get(keyOf(c, r)), "dkg-range");
  }
  add(t.cells.get(keyOf(active.col, active.row)), "dkg-active");
  add(t.colHeads[active.col], "dkg-on");
  add(t.rowHeads.get(active.row), "dkg-on");
  return marked;
}
