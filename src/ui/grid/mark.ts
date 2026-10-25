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
  prev.forEach((e) => e.classList.remove("dkg-active", "dkg-range", "dkg-on", "dkg-on-active", "dkg-e-t", "dkg-e-b", "dkg-e-l", "dkg-e-r", "dkg-h"));
  const marked: HTMLElement[] = [];
  const add = (e: HTMLElement | undefined, cls: string) => {
    if (!e) return;
    e.classList.add(cls);
    marked.push(e);
  };
  const [c0, c1] = [Math.min(anchor.col, active.col), Math.max(anchor.col, active.col)];
  const [r0, r1] = [Math.min(anchor.row, active.row), Math.max(anchor.row, active.row)];
  const multi = c0 !== c1 || r0 !== r1;
  for (const [r, head] of t.rowHeads) {
    if (r < r0 || r > r1) continue;
    add(head, "dkg-on"); // every header of the selection lights up (whole rows/columns included)
    if (r === active.row) add(head, "dkg-on-active");
    if (!multi) continue;
    for (let c = c0; c <= c1; c++) {
      const el = t.cells.get(keyOf(c, r));
      add(el, "dkg-range");
      // outline of the range on its edge cells (rendered rows only)
      if (r === r0) add(el, "dkg-e-t");
      if (r === r1) add(el, "dkg-e-b");
      if (c === c0) add(el, "dkg-e-l");
      if (c === c1) add(el, "dkg-e-r");
    }
  }
  for (let c = c0; c <= c1; c++) {
    add(t.colHeads[c], "dkg-on");
    if (c === active.col) add(t.colHeads[c], "dkg-on-active");
  }
  add(t.cells.get(keyOf(c1, r1)), "dkg-h"); // fill handle: bottom-right corner of the selection
  add(t.cells.get(keyOf(active.col, active.row)), "dkg-active");
  return marked;
}
