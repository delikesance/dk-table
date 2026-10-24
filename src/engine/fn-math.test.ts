import { describe, it, expect } from "vitest";
import { mathFunctions as f } from "./fn-math";

import { err } from "./types";

describe("PRODUCT", () => {
  it("multiplies range numbers, ignores text/blank in ranges", () => {
    expect(f.PRODUCT([[1, 2, 3]])).toBe(6);
    expect(f.PRODUCT([[2, "x", ""], 4])).toBe(8);
  });
  it("coerces scalars, errors on bad text, 0 when no numbers", () => {
    expect(f.PRODUCT(["3", 2])).toBe(6);
    expect(f.PRODUCT(["abc"])).toEqual(err("#VALUE!"));
    expect(f.PRODUCT([["a", ""]])).toBe(0);
  });
});

describe("MOD", () => {
  it("computes remainder with divisor sign", () => {
    expect(f.MOD([7, 3])).toBe(1);
    expect(f.MOD([-7, 3])).toBe(2);
    expect(f.MOD([7, -3])).toBe(-2);
  });
  it("errors", () => {
    expect(f.MOD([5, 0])).toEqual(err("#DIV/0!"));
    expect(f.MOD([5])).toEqual(err("#VALUE!"));
    expect(f.MOD(["a", 2])).toEqual(err("#VALUE!"));
  });
});

describe("MEDIAN", () => {
  it("odd, even, unsorted, text ignored in ranges", () => {
    expect(f.MEDIAN([[3, 1, 2]])).toBe(2);
    expect(f.MEDIAN([[4, 1, 3, 2]])).toBe(2.5);
    expect(f.MEDIAN([[1, "x", 5], 3])).toBe(3);
  });
  it("empty -> #VALUE!", () => {
    expect(f.MEDIAN([["a", ""]])).toEqual(err("#VALUE!"));
  });
});

describe("COUNTA", () => {
  it("counts non-empty cells, text included", () => {
    expect(f.COUNTA([[1, "x", "", true, 0]])).toBe(4);
    expect(f.COUNTA([[1, "x"], "y"])).toBe(3);
  });
  it("counts errors, empty range is 0", () => {
    expect(f.COUNTA([[err("#REF!"), ""]])).toBe(1);
    expect(f.COUNTA([["", ""]])).toBe(0);
  });
});
