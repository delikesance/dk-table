import { describe, expect, it } from "vitest";
import { createSheet, getDisplay, setCell } from "./sheet";
import { listFunctionNames } from "./functions";
import { registerLive } from "./live/adapter";

/**
 * Wired check: every function is callable from a real cell formula.
 * Data: A1:A3 = 1,2,3 ; B1:B3 = 10,20,30 ; C1:C3 = a,b,c.
 */
registerLive();

/** Evaluate `formula` in D1 of a sheet pre-filled with the data above. */
function ev(formula: string): string {
  const s = createSheet();
  [["A1", "1"], ["A2", "2"], ["A3", "3"], ["B1", "10"], ["B2", "20"], ["B3", "30"],
    ["C1", "a"], ["C2", "b"], ["C3", "c"]].forEach(([a, v]) => setCell(s, a, v));
  setCell(s, "D1", formula);
  return getDisplay(s, "D1");
}

const CASES: [string, string, string][] = [
  ["PRODUCT", "=PRODUCT(A1:A3)", "6"], ["MOD", "=MOD(7,3)", "1"],
  ["MEDIAN", "=MEDIAN(A1:A3)", "2"], ["COUNTA", "=COUNTA(C1:C3)", "3"],
  ["LEFT", '=LEFT("abc",2)', "ab"], ["RIGHT", '=RIGHT("abc",2)', "bc"],
  ["MID", '=MID("abcd",2,2)', "bc"], ["LEN", '=LEN("abc")', "3"],
  ["TRIM", '=TRIM("  a  b ")', "a b"], ["UPPER", '=UPPER("a")', "A"],
  ["LOWER", '=LOWER("A")', "a"], ["TEXT", '=TEXT(1.5,"0.00")', "1,50"],
  ["AND", "=AND(1,1)", "TRUE"], ["OR", "=OR(0,1)", "TRUE"], ["NOT", "=NOT(0)", "TRUE"],
  ["ISNUMBER", "=ISNUMBER(A1)", "TRUE"], ["ISBLANK", "=ISBLANK(Z9)", "TRUE"],
  ["DATE", "=YEAR(DATE(2026,10,24))", "2026"], ["YEAR", "=YEAR(DATE(2026,10,24))", "2026"],
  ["MONTH", "=MONTH(DATE(2026,10,24))", "10"], ["DAY", "=DAY(DATE(2026,10,24))", "24"],
  ["TODAY", "=TODAY()>40000", "TRUE"], ["NOW", "=NOW()>40000", "TRUE"],
  ["PMT", "=PMT(0,12,1200)", "-100"], ["NPV", "=NPV(0,A1:A3)", "6"],
  ["IRR", "=IRR(-100,110)", "0.1"],
  ["SUMIF", '=SUMIF(A1:A3,">1",B1:B3)', "50"], ["SUMIFS", '=SUMIFS(B1:B3,A1:A3,">1")', "50"],
  ["COUNTIF", '=COUNTIF(A1:A3,">1")', "2"], ["COUNTIFS", '=COUNTIFS(A1:A3,">1",B1:B3,"<30")', "1"],
  ["MATCH", "=MATCH(2,A1:A3,0)", "2"], ["INDEX", "=INDEX(B1:B3,2)", "20"],
  ["XLOOKUP", "=XLOOKUP(2,A1:A3,B1:B3)", "20"],
  ["IF", '=IF(1,"y","n")', "y"], ["IFERROR", '=IFERROR(1/0,"x")', "x"], ["IFNA", "=IFNA(5,0)", "5"],
  ["SUM", "=SUM(A1:A3)", "6"], ["SPARKLINE", "=SPARKLINE(A1:A3)", ""],
];

describe("functions wired into cells", () => {
  for (const [name, f, want] of CASES) {
    it(`${name}: ${f}`, () => {
      const got = ev(f);
      expect(got).not.toBe("#NAME?");
      if (want !== "") expect(got).toBe(want);
    });
  }
  /** 2D ranges reach matrix-aware functions (wantsMatrix); #N/A for not-found lookups. */
  it("VLOOKUP 2D", () => expect(ev("=VLOOKUP(2,A1:B3,2,FALSE)")).toBe("20"));
  it("HLOOKUP 2D", () => expect(ev("=HLOOKUP(20,A1:B3,2,FALSE)")).toBe("#N/A"));
  it("HLOOKUP row", () => expect(ev("=HLOOKUP(1,A1:B3,3,FALSE)")).toBe("3"));
  it("INDEX 2D", () => expect(ev("=INDEX(A1:B3,2,2)")).toBe("20"));
  it("MATCH", () => expect(ev("=MATCH(30,B1:B3,0)")).toBe("3"));
  it("XLOOKUP 2D col", () => expect(ev("=XLOOKUP(3,A1:A3,C1:C3)")).toBe("c"));
  it("SUMIF different columns", () => expect(ev('=SUMIF(A1:A3,">0",B1:B3)')).toBe("60"));
  it("SUMIF sum_range resized", () => expect(ev('=SUMIF(A1:A2,">0",B1:B3)')).toBe("30"));
  it("SUMIFS 2D", () => expect(ev('=SUMIFS(B1:B3,A1:A3,">1",C1:C3,"c")')).toBe("30"));
  it("COUNTIF 2D range", () => expect(ev('=COUNTIF(A1:B3,">2")')).toBe("4"));
  it("VLOOKUP not found is #N/A", () => expect(ev("=VLOOKUP(9,A1:B3,2,FALSE)")).toBe("#N/A"));
  it("IFNA catches #N/A", () => expect(ev('=IFNA(VLOOKUP(9,A1:B3,2,FALSE),"absent")')).toBe("absent"));
  it("IFNA ignores other errors", () => expect(ev('=IFNA(1/0,"x")')).toBe("#DIV/0!"));
  it("IFERROR catches #N/A", () => expect(ev('=IFERROR(MATCH(9,A1:A3,0),"x")')).toBe("x"));
  it("#N/A propagates", () => expect(ev("=1+MATCH(9,A1:A3,0)")).toBe("#N/A"));
  it("lookup recalcs on range change", () => {
    const s = createSheet();
    setCell(s, "A1", "1"); setCell(s, "B1", "10"); setCell(s, "A2", "2"); setCell(s, "B2", "20");
    setCell(s, "D1", "=VLOOKUP(2,A1:B2,2,FALSE)");
    expect(getDisplay(s, "D1")).toBe("20");
    setCell(s, "B2", "99");
    expect(getDisplay(s, "D1")).toBe("99");
  });
  it("listFunctionNames covers every case", () => {
    const names = listFunctionNames();
    for (const [n] of CASES) expect(names, n).toContain(n);
    for (const n of ["VLOOKUP", "HLOOKUP", "BAR", "TREND"]) expect(names, n).toContain(n);
  });
});
