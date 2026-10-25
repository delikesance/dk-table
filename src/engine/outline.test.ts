import { describe, it, expect } from "vitest";
import { emptyOutline, setLevel, collapse, expand, hiddenRows, showLevel, MAX_LEVEL } from "./outline";

/** Rows 0..6: levels 2,2,1(sub-total),2,2,1(sub-total),0(grand total). */
const base = () => {
  let o = emptyOutline(7);
  [0, 1, 3, 4].forEach((r) => (o = setLevel(o, r, 2)));
  [2, 5].forEach((r) => (o = setLevel(o, r, 1)));
  o = setLevel(o, 6, 0);
  return o;
};

describe("outline model", () => {
  it("starts with every row at level 0, nothing hidden", () => {
    const o = emptyOutline(3);
    expect(o.levels).toEqual([0, 0, 0]);
    expect(hiddenRows(o).size).toBe(0);
  });

  it("accepts levels 0 to MAX_LEVEL only", () => {
    expect(MAX_LEVEL).toBe(8);
    expect(() => setLevel(emptyOutline(2), 0, 9)).toThrow(RangeError);
    expect(() => setLevel(emptyOutline(2), 0, -1)).toThrow(RangeError);
    expect(() => setLevel(emptyOutline(2), 0, 1.5)).toThrow(RangeError);
    expect(setLevel(emptyOutline(2), 1, 8).levels).toEqual([0, 8]);
  });

  it("collapsing a sub-total hides the detail rows above it up to the previous summary", () => {
    const o = collapse(base(), 2);
    expect([...hiddenRows(o)].sort()).toEqual([0, 1]);
  });

  it("collapsing the grand total hides every group above it, sub-groups included", () => {
    const o = collapse(base(), 6);
    expect([...hiddenRows(o)].sort()).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("expanding restores visibility without expanding separately collapsed sub-groups", () => {
    let o = collapse(base(), 2);
    o = collapse(o, 6);
    o = expand(o, 6);
    expect(hiddenRows(o).size).toBe(2);
    expect([...hiddenRows(o)].sort()).toEqual([0, 1]);
    o = expand(o, 2);
    expect(hiddenRows(o).size).toBe(0);
  });

  it("collapsing a row without detail above is a no-op", () => {
    const o = collapse(base(), 6);
    expect(collapse(emptyOutline(3), 2).collapsed).toEqual([]);
    expect(o.collapsed.map((f) => f.row)).toContain(6);
  });

  it("showLevel(n) hides every row deeper than n and keeps the others visible", () => {
    const o = showLevel(base(), 1);
    expect([...hiddenRows(o)].sort()).toEqual([0, 1, 3, 4]);
    expect(showLevel(base(), 3).collapsed).toEqual([]);
    expect(hiddenRows(showLevel(base(), 0)).size).toBe(6);
  });

  it("showLevel(n) with mixed levels never hides a row of level <= n", () => {
    let o = emptyOutline(4);
    [3, 1, 3, 0].forEach((l, r) => (o = setLevel(o, r, l)));
    expect([...hiddenRows(showLevel(o, 2))].sort()).toEqual([0, 2]);
    expect([...hiddenRows(showLevel(o, 0))].sort()).toEqual([0, 1, 2]);
  });

  it("expanding a summary after showLevel shows its group, inner folds kept", () => {
    const o = expand(showLevel(base(), 0), 6);
    expect([...hiddenRows(o)].sort()).toEqual([]);
    const p = expand(collapse(collapse(base(), 2), 6), 6);
    expect([...hiddenRows(p)].sort()).toEqual([0, 1]);
  });
});
