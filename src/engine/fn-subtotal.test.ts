import { describe, it, expect } from "vitest";
import { createSheet, setCell, getDisplay } from "./sheet";

/** A1:A6 = 10, 20, #DIV/0!, 40, 50, #REF! ; B1:B5 = 1, 2, 3, 4, "x". */
const DATA: Record<string, string> = {
  A1: "10", A2: "20", A3: "=1/0", A4: "40", A5: "50", A6: "=#REF!",
  B1: "1", B2: "2", B3: "3", B4: "4", B5: "x",
};

/** Displayed result of `f` evaluated in Z1 over DATA. */
function ev(f: string): string {
  const s = createSheet();
  for (const [k, v] of Object.entries(DATA)) setCell(s, k, v);
  setCell(s, "Z1", f);
  return getDisplay(s, "Z1");
}
/** Numeric result of `f`. */
const num = (f: string) => Number(ev(f));

describe("SUBTOTAL", () => {
  it("codes 1-11", () => {
    const got = [1, 2, 3, 4, 5, 6, 9].map((c) => num(`=SUBTOTAL(${c},B1:B5)`));
    expect(got).toEqual([2.5, 4, 5, 4, 1, 24, 10]);
    expect(num("=SUBTOTAL(7,B1:B5)")).toBeCloseTo(1.2909944, 6);
    expect(num("=SUBTOTAL(8,B1:B5)")).toBeCloseTo(1.118034, 6);
    expect(num("=SUBTOTAL(10,B1:B5)")).toBeCloseTo(1.6666667, 6);
    expect(num("=SUBTOTAL(11,B1:B5)")).toBeCloseTo(1.25, 10);
  });
  it("codes 101-111 behave like 1-11 (no hidden rows)", () => {
    expect(num("=SUBTOTAL(109,B1:B5)")).toBe(10);
    expect(num("=SUBTOTAL(101,B1:B5)")).toBe(2.5);
  });
  it("several refs", () => expect(num("=SUBTOTAL(9,B1:B2,B3:B4)")).toBe(10));
  it("errors in the range propagate", () => expect(ev("=SUBTOTAL(9,A1:A5)")).toBe("#DIV/0!"));
  it("unknown code -> #VALUE!", () => {
    expect(ev("=SUBTOTAL(12,B1:B5)")).toBe("#VALUE!");
    expect(ev("=SUBTOTAL(0,B1:B5)")).toBe("#VALUE!");
  });
});

describe("AGGREGATE", () => {
  it("option 6 ignores error cells (codes 1-13)", () => {
    const got = [1, 2, 3, 4, 5, 6, 9, 12].map((c) => num(`=AGGREGATE(${c},6,A1:A6)`));
    expect(got).toEqual([30, 4, 4, 50, 10, 400000, 120, 30]);
    expect(num("=AGGREGATE(13,6,A1:A6,B1:B2,B1)")).toBe(1);
  });
  it("k functions 14-19", () => {
    expect(num("=AGGREGATE(14,6,A1:A6,3)")).toBe(20);
    expect(num("=AGGREGATE(15,6,A1:A6,1)")).toBe(10);
    expect(num("=AGGREGATE(16,6,A1:A6,0.5)")).toBe(30);
    expect(num("=AGGREGATE(17,6,A1:A6,1)")).toBe(17.5);
    expect(num("=AGGREGATE(18,6,A1:A6,0.5)")).toBe(30);
    expect(num("=AGGREGATE(19,6,A1:A6,1)")).toBe(12.5);
  });
  it("options 2, 3, 7 also ignore errors", () => {
    for (const o of [2, 3, 7]) expect(num(`=AGGREGATE(9,${o},A1:A6)`)).toBe(120);
  });
  it("options 0, 1, 4, 5 propagate errors", () => {
    for (const o of [0, 1, 4, 5]) expect(ev(`=AGGREGATE(9,${o},A1:A6)`)).toBe("#DIV/0!");
    expect(num("=AGGREGATE(9,4,B1:B5)")).toBe(10);
  });
  it("bad code, option or k", () => {
    expect(ev("=AGGREGATE(20,6,A1:A6)")).toBe("#VALUE!");
    expect(ev("=AGGREGATE(9,8,A1:A6)")).toBe("#VALUE!");
    expect(ev("=AGGREGATE(14,6,A1:A6)")).toBe("#VALUE!");
    expect(ev("=AGGREGATE(14,6,A1:A6,9)")).toBe("#NUM!");
    expect(ev("=AGGREGATE(18,6,A1:A6,0.1)")).toBe("#NUM!");
  });
});
