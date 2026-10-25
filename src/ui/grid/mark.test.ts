// @vitest-environment jsdom
/** Selection rendering: range outline classes on the edge cells only, headers lit across the whole range. */
import { describe, expect, it } from "vitest";
import { markSelection, type MarkTargets } from "./mark";
import { keyOf } from "./keys";

/** A 4x4 rendered window. */
function targets(): MarkTargets {
  const cells = new Map<string, HTMLElement>();
  const rowHeads = new Map<number, HTMLElement>();
  for (let r = 0; r < 4; r++) {
    rowHeads.set(r, document.createElement("div"));
    for (let c = 0; c < 4; c++) cells.set(keyOf(c, r), document.createElement("div"));
  }
  return { cells, rowHeads, colHeads: Array.from({ length: 4 }, () => document.createElement("div")) };
}
const cls = (t: MarkTargets, k: string) => [...t.cells.get(k)!.classList].sort().join(" ");

describe("markSelection", () => {
  it("outlines the range on its edge cells (corners get two edges, inside none)", () => {
    const t = targets();
    markSelection([], t, { col: 0, row: 0 }, { col: 2, row: 2 });
    expect(cls(t, "A1")).toContain("dkg-e-t");
    expect(cls(t, "A1")).toContain("dkg-e-l");
    expect(cls(t, "C3")).toContain("dkg-e-b");
    expect(cls(t, "C3")).toContain("dkg-e-r");
    expect(cls(t, "B2")).toBe("dkg-range");
    expect(cls(t, "B1")).toBe("dkg-e-t dkg-range");
  });
  it("a single cell has no range outline; leaving a range clears it", () => {
    const t = targets();
    const marked = markSelection([], t, { col: 0, row: 0 }, { col: 1, row: 1 });
    markSelection(marked, t, { col: 1, row: 1 }, { col: 1, row: 1 });
    expect(cls(t, "A1")).toBe("");
    expect(cls(t, "B2")).toBe("dkg-active dkg-h");
  });
  it("lights every header of the range, the active ones strongest", () => {
    const t = targets();
    markSelection([], t, { col: 0, row: 0 }, { col: 2, row: 1 });
    expect(t.colHeads.map((h) => h.classList.contains("dkg-on"))).toEqual([true, true, true, false]);
    expect(t.colHeads[2].classList.contains("dkg-on-active")).toBe(true);
    expect(t.colHeads[0].classList.contains("dkg-on-active")).toBe(false);
    expect(t.rowHeads.get(1)!.classList.contains("dkg-on-active")).toBe(true);
  });
});

describe("poignée de recopie", () => {
  it("marque la cellule en bas à droite de la plage (dkg-h), une seule", () => {
    const t = targets();
    const marked = markSelection([], t, { col: 2, row: 2 }, { col: 0, row: 0 });
    expect(cls(t, "C3")).toContain("dkg-h");
    expect(new Set(marked.filter((e) => e.classList.contains("dkg-h"))).size).toBe(1);
    markSelection(marked, t, { col: 0, row: 0 }, { col: 0, row: 0 });
    expect(cls(t, "C3")).not.toContain("dkg-h");
    expect(cls(t, "A1")).toContain("dkg-h");
  });
});
