import { describe, expect, it } from "vitest";
import { clampFreeze, colLeft, freezeVars, pinnedRows, revealTop, frozenPx } from "./freeze";

describe("clampFreeze", () => {
  it("keeps at least one scrollable row/col and drops junk", () => {
    expect(clampFreeze({ rows: 3, cols: 2 }, 26, 1000)).toEqual({ rows: 3, cols: 2 });
    expect(clampFreeze({ rows: 5000, cols: 99 }, 26, 1000)).toEqual({ rows: 999, cols: 25 });
    expect(clampFreeze({ rows: -2, cols: 1.7 }, 26, 1000)).toEqual({ rows: 0, cols: 1 });
    expect(clampFreeze(undefined, 26, 1000)).toEqual({ rows: 0, cols: 0 });
  });
});

describe("colLeft", () => {
  it("sums the row header and previous column widths", () => {
    expect(colLeft(0, {})).toBe("var(--row-header-w)");
    expect(colLeft(2, {})).toBe("calc(var(--row-header-w) + var(--cell-w) * 2)");
    expect(colLeft(3, { 1: 120 })).toBe("calc(var(--row-header-w) + var(--cell-w) * 2 + 120px)");
  });
});

describe("freezeVars", () => {
  it("gives sticky offsets per frozen row/col plus a left scroll padding", () => {
    const v = freezeVars({ rows: 2, cols: 1 }, {}, () => false);
    expect(v["--dkg-t0"]).toBe("calc(var(--col-header-h) + 0px)");
    expect(v["--dkg-t1"]).toBe("calc(var(--col-header-h) + 28px)");
    expect(v["--dkg-l0"]).toBe("var(--row-header-w)");
    expect(v["scroll-padding-top"]).toBeUndefined();
    expect(v["scroll-padding-left"]).toBe("calc(var(--row-header-w) + var(--cell-w) * 1)");
  });
  it("hidden (filtered) frozen rows take no height", () => {
    const v = freezeVars({ rows: 3, cols: 0 }, {}, (r) => r === 1);
    expect(v["--dkg-t2"]).toBe("calc(var(--col-header-h) + 28px)");
  });
});

describe("pinnedRows / frozenPx / revealTop", () => {
  it("pins frozen rows that are not filtered out", () => {
    expect(pinnedRows({ rows: 3, cols: 0 }, null)).toEqual([0, 1, 2]);
    expect(pinnedRows({ rows: 3, cols: 0 }, [0, 2, 5])).toEqual([0, 2]);
  });
  it("frozen height counts visible frozen rows", () => {
    expect(frozenPx({ rows: 3, cols: 0 }, (r) => r === 0)).toBe(56);
  });
  it("keeps a row below the frozen band visible", () => {
    // 2 frozen rows, row index 6 hidden under them at scrollTop 140: scroll back to 112
    expect(revealTop(6, 2, 140, 280)).toBe(112);
    // already visible: unchanged
    expect(revealTop(6, 2, 100, 280)).toBe(100);
    // frozen row: never scrolls
    expect(revealTop(1, 2, 500, 280)).toBe(500);
    // below the viewport: bottom-aligned
    expect(revealTop(20, 2, 0, 280)).toBe(22 * 28 - 280);
  });
});
