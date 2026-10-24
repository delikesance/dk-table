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
  /** 2D ranges are flattened by the evaluator: tracked by task engine-matrix-na. */
  it.todo("VLOOKUP from a formula (needs 2D ranges)");
  it.todo("HLOOKUP from a formula (needs 2D ranges)");
  it.todo("INDEX(range; row; col) 2D from a formula (needs 2D ranges)");
  it("listFunctionNames covers every case", () => {
    const names = listFunctionNames();
    for (const [n] of CASES) expect(names, n).toContain(n);
    for (const n of ["VLOOKUP", "HLOOKUP", "BAR", "TREND"]) expect(names, n).toContain(n);
  });
});
