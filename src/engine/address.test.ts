/** Unit tests for address.ts: key parsing/building, bounds, normalisation and range expansion. */
import { describe, it, expect } from "vitest";
import { parseKey, makeKey, inBounds, normKey, expandRange } from "./address";
import { createSheet } from "./sheet";

describe("parseKey", () => {
  it("parses simple and lowercase keys", () => {
    expect(parseKey("A1")).toEqual({ col: 1, row: 1 });
    expect(parseKey("b12")).toEqual({ col: 2, row: 12 });
  });
  it("parses multi-letter columns (AA+)", () => {
    expect(parseKey("Z1")?.col).toBe(26);
    expect(parseKey("AA1")?.col).toBe(27);
    expect(parseKey("AZ1")?.col).toBe(52);
    expect(parseKey("BA1")?.col).toBe(53);
    expect(parseKey("ZZ1")?.col).toBe(702);
    expect(parseKey("AAA1")?.col).toBe(703);
  });
  it("rejects malformed keys (A01, A0, $A$1, empty, 1A, 4 letters)", () => {
    for (const k of ["A01", "A0", "$A$1", "", "A", "1", "1A", "A-1", "A1B", "ABCD1", "A 1"])
      expect(parseKey(k), k).toBeNull();
  });
});

describe("makeKey", () => {
  it("builds keys, round-trips with parseKey", () => {
    expect(makeKey(1, 1)).toBe("A1");
    expect(makeKey(26, 5)).toBe("Z5");
    expect(makeKey(27, 1)).toBe("AA1");
    expect(makeKey(52, 1)).toBe("AZ1");
    expect(makeKey(53, 1)).toBe("BA1");
    for (const c of [1, 25, 26, 27, 52, 53, 676, 677, 702, 703])
      expect(parseKey(makeKey(c, 7))).toEqual({ col: c, row: 7 });
  });
});

describe("inBounds / normKey", () => {
  const s = createSheet();
  it("accepts edges, rejects outside and malformed", () => {
    expect(inBounds(s, "A1")).toBe(true);
    expect(inBounds(s, "Z100")).toBe(true);
    expect(inBounds(s, "AA1")).toBe(false);
    expect(inBounds(s, "A101")).toBe(false);
    expect(inBounds(s, "A0")).toBe(false);
    expect(inBounds(s, "A01")).toBe(false);
    expect(inBounds(s, "")).toBe(false);
  });
  it("uppercases keys", () => expect(normKey("ab3")).toBe("AB3"));
});

describe("expandRange", () => {
  const s = createSheet();
  it("expands row-major", () => {
    expect(expandRange(s, "A1", "B2")).toEqual(["A1", "B1", "A2", "B2"]);
  });
  it("single cell and reversed endpoints", () => {
    expect(expandRange(s, "C3", "C3")).toEqual(["C3"]);
    expect(expandRange(s, "B2", "A1")).toEqual(["A1", "B1", "A2", "B2"]);
  });
  it("column and row ranges", () => {
    expect(expandRange(s, "A1", "A3")).toEqual(["A1", "A2", "A3"]);
    expect(expandRange(s, "A1", "C1")).toEqual(["A1", "B1", "C1"]);
  });
  it("returns null for out-of-bounds or malformed endpoints", () => {
    expect(expandRange(s, "A1", "AA1")).toBeNull();
    expect(expandRange(s, "A1", "A101")).toBeNull();
    expect(expandRange(s, "A01", "A2")).toBeNull();
  });
});
