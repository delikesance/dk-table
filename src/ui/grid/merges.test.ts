import { describe, expect, it } from "vitest";
import { absorbed, absorbedKeys, addMerge, fmtRect, mergeAt, parseRect, removeMerges, shiftMerges, stepOut } from "./merges";

describe("merges", () => {
  it("parses and formats ranges", () => {
    expect(parseRect("D3:B2")).toEqual({ c0: 1, r0: 1, c1: 3, r1: 2 });
    expect(fmtRect(parseRect("D3:B2"))).toBe("B2:D3");
  });
  it("addMerge ignores a single cell and dissolves overlapping merges", () => {
    expect(addMerge([], parseRect("B2"))).toEqual([]);
    expect(addMerge(["A1:B2", "F1:G1"], parseRect("B2:C3"))).toEqual(["F1:G1", "B2:C3"]);
  });
  it("removeMerges drops every merge touching the range", () => {
    expect(removeMerges(["A1:B2", "F1:G1"], parseRect("B2"))).toEqual(["F1:G1"]);
  });
  it("mergeAt / absorbed / absorbedKeys", () => {
    const m = [parseRect("B2:C3")];
    expect(mergeAt(m, 2, 2)).toBe(m[0]);
    expect(absorbed(m, 1, 1)).toBe(false);
    expect(absorbed(m, 2, 2)).toBe(true);
    expect(absorbedKeys(m[0])).toEqual(["C2", "B3", "C3"]);
  });
  it("stepOut leaves the merge in the move direction and snaps when entering", () => {
    const m = [parseRect("B2:D3")];
    expect(stepOut(m, { col: 1, row: 1 }, { col: 2, row: 1 }, 26, 100)).toEqual({ col: 4, row: 1 }); // right: out
    expect(stepOut(m, { col: 1, row: 1 }, { col: 1, row: 2 }, 26, 100)).toEqual({ col: 1, row: 3 }); // down: out
    expect(stepOut(m, { col: 4, row: 1 }, { col: 3, row: 1 }, 26, 100)).toEqual({ col: 1, row: 1 }); // left into: anchor
    expect(stepOut(m, { col: 1, row: 1 }, { col: 0, row: 1 }, 26, 100)).toEqual({ col: 0, row: 1 }); // left: out
    expect(stepOut(m, { col: 0, row: 0 }, { col: 0, row: 1 }, 26, 100)).toEqual({ col: 0, row: 1 }); // untouched
  });
  it("shiftMerges moves, grows and drops merges", () => {
    expect(shiftMerges(["B2:C3"], { axis: "row", at: 1, n: 1 })).toEqual(["B3:C4"]);
    expect(shiftMerges(["B2:C3"], { axis: "row", at: 3, n: 1 })).toEqual(["B2:C4"]);
    expect(shiftMerges(["B2:C3"], { axis: "col", at: 2, n: -2 })).toEqual([]);
    expect(shiftMerges(["B2:C3"], { axis: "row", at: 2, n: -1 })).toEqual(["B2:C2"]);
  });
});
