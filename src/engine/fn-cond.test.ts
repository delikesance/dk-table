/** Tests for conditional functions (SUMIF, SUMIFS, COUNTIF, COUNTIFS), called directly on builtins. */
import { describe, expect, it } from "vitest";
import { condFunctions as f } from "./fn-cond";
import { err } from "./types";

const A = [1, -2, 5, 3];
const B = [10, 20, 30, 40];
const T = ["Pomme", "poire", "pomme", ""];

describe("COUNTIF", () => {
  it("exact number and text (case-insensitive)", () => {
    expect(f.COUNTIF([A, 5])).toBe(1);
    expect(f.COUNTIF([T, "POMME"])).toBe(2);
  });
  it("operators", () => {
    expect(f.COUNTIF([A, ">2"])).toBe(2);
    expect(f.COUNTIF([A, "<=1"])).toBe(2);
    expect(f.COUNTIF([T, "<>pomme"])).toBe(2);
    expect(f.COUNTIF([A, "=5"])).toBe(1);
  });
  it("wildcards", () => {
    expect(f.COUNTIF([T, "po*"])).toBe(3);
    expect(f.COUNTIF([T, "po?re"])).toBe(1);
  });
  it("blank criterion matches empty", () => {
    expect(f.COUNTIF([T, "="])).toBe(1);
  });
  it("errors", () => {
    expect(f.COUNTIF([A])).toEqual(err("#VALUE!"));
    expect(f.COUNTIF([A, err("#REF!")])).toEqual(err("#REF!"));
  });
});

describe("SUMIF", () => {
  it('=SUMIF(A1:A3,">0",B1:B3)', () => {
    expect(f.SUMIF([[1, -2, 5], ">0", [10, 20, 30]])).toBe(40);
  });
  it("sums the range itself without sum_range", () => {
    expect(f.SUMIF([A, ">0"])).toBe(9);
  });
  it("text criterion and wildcard", () => {
    expect(f.SUMIF([T, "pomme", B])).toBe(40);
    expect(f.SUMIF([T, "p*", B])).toBe(60);
  });
  it("size mismatch is #VALUE!", () => {
    expect(f.SUMIF([A, ">0", [1, 2]])).toEqual(err("#VALUE!"));
  });
  it("ignores non-numeric sum cells", () => {
    expect(f.SUMIF([A, ">0", ["x", 1, 2, 3]])).toBe(6);
  });
});

describe("COUNTIFS / SUMIFS", () => {
  it("COUNTIFS combines criteria with AND", () => {
    expect(f.COUNTIFS([A, ">0", B, ">=30"])).toBe(2);
  });
  it("SUMIFS", () => {
    expect(f.SUMIFS([B, A, ">0", T, "p*"])).toBe(40);
  });
  it("errors", () => {
    expect(f.COUNTIFS([A, ">0", [1], "1"])).toEqual(err("#VALUE!"));
    expect(f.SUMIFS([B, A])).toEqual(err("#VALUE!"));
    expect(f.COUNTIFS([A])).toEqual(err("#VALUE!"));
  });
});
