import { describe, expect, it } from "vitest";
import { colToLetters, lettersToCol, parseRange, rangeSize, rangeToMatrix } from "./range";

describe("parseRange", () => {
  it("parses A1:B3", () => {
    expect(parseRange("A1:B3")).toEqual({ c1: 1, r1: 1, c2: 2, r2: 3 });
  });
  it("normalizes a reversed range", () => {
    expect(parseRange("B3:A1")).toEqual({ c1: 1, r1: 1, c2: 2, r2: 3 });
  });
  it("accepts a single cell and A1:A1", () => {
    expect(parseRange("C4")).toEqual({ c1: 3, r1: 4, c2: 3, r2: 4 });
    expect(parseRange("A1:A1")).toEqual({ c1: 1, r1: 1, c2: 1, r2: 1 });
  });
  it("ignores $ and case", () => {
    expect(parseRange("$a$1:$B$3")).toEqual({ c1: 1, r1: 1, c2: 2, r2: 3 });
  });
  it("returns null when invalid", () => {
    for (const s of ["", "A", "A0", "A01:B2", "A1:", ":B2", "A1:B2:C3", "1A", "A1:B"])
      expect(parseRange(s)).toBeNull();
  });
  it("checks optional bounds", () => {
    expect(parseRange("A1:Z100", { cols: 26, rows: 100 })).not.toBeNull();
    expect(parseRange("A1:AA1", { cols: 26, rows: 100 })).toBeNull();
    expect(parseRange("A1:A101", { cols: 26, rows: 100 })).toBeNull();
  });
});

describe("rangeSize", () => {
  it("returns rows and cols", () => {
    expect(rangeSize({ c1: 1, r1: 1, c2: 2, r2: 3 })).toEqual({ rows: 3, cols: 2 });
    expect(rangeSize({ c1: 1, r1: 1, c2: 1, r2: 1 })).toEqual({ rows: 1, cols: 1 });
  });
});

describe("rangeToMatrix", () => {
  const values = (k: string) => k;
  it("builds a 3x2 matrix row-major", () => {
    const m = rangeToMatrix(values, parseRange("A1:B3")!);
    expect(m).toEqual([["A1", "B1"], ["A2", "B2"], ["A3", "B3"]]);
  });
  it("accepts a record of values", () => {
    expect(rangeToMatrix({ A1: 5 }, parseRange("A1:A2")!)).toEqual([[5], [""]]);
  });
});

describe("column letters", () => {
  it("round-trips", () => {
    for (const l of ["A", "Z", "AA", "AZ", "ZZ", "AAA"]) expect(colToLetters(lettersToCol(l)!)).toBe(l);
    expect(lettersToCol("A")).toBe(1);
    expect(lettersToCol("AA")).toBe(27);
    expect(colToLetters(52)).toBe("AZ");
  });
  it("rejects invalid input", () => {
    expect(lettersToCol("")).toBeNull();
    expect(lettersToCol("A1")).toBeNull();
  });
});
