import { describe, it, expect } from "vitest";
import { visibleRange, scrollToRow, MAX_ROWS } from "./virtual";

describe("visibleRange", () => {
  it("top of sheet: starts at 0, ends after viewport + overscan", () => {
    expect(visibleRange(0, 280, 28, 1000, 10)).toEqual({ start: 0, end: 20 });
  });
  it("scrolled: overscan on both sides", () => {
    expect(visibleRange(2800, 280, 28, 1000, 10)).toEqual({ start: 90, end: 120 });
  });
  it("clamps to total at the bottom", () => {
    expect(visibleRange(27000, 280, 28, 1000, 10)).toEqual({ start: 954, end: 985 });
    expect(visibleRange(1e9, 280, 28, 1000, 10)).toEqual({ start: 1000, end: 1000 });
  });
  it("negative scroll and empty totals", () => {
    expect(visibleRange(-50, 280, 28, 1000, 0)).toEqual({ start: 0, end: 10 });
    expect(visibleRange(0, 280, 28, 0, 10)).toEqual({ start: 0, end: 0 });
  });
  it("partial rows count as visible", () => {
    expect(visibleRange(14, 28, 28, 100, 0)).toEqual({ start: 0, end: 2 });
  });
  it("MAX_ROWS default is 1000", () => expect(MAX_ROWS).toBe(1000));
});

describe("scrollToRow", () => {
  it("keeps scroll when visible, moves up/down otherwise", () => {
    expect(scrollToRow(5, 0, 280, 28)).toBe(0);
    expect(scrollToRow(1, 100, 280, 28)).toBe(28);
    expect(scrollToRow(999, 0, 280, 28)).toBe(999 * 28 + 28 - 252);
  });
});
