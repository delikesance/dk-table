/** Unit tests for refs.ts: shiftFormula (relative/absolute refs, strings, ranges, #REF!). */
import { describe, it, expect } from "vitest";
import { shiftFormula } from "./refs";

describe("shiftFormula", () => {
  it("shifts relative parts, keeps $ parts", () => {
    expect(shiftFormula("=A1+$B$2+C$3+$D4", 1, 1)).toBe("=B2+$B$2+D$3+$D5");
  });
  it("a ref leaving the sheet becomes #REF!", () => {
    expect(shiftFormula("=A1", 0, -1)).toBe("=#REF!");
    expect(shiftFormula("=A1+1", -1, 0)).toBe("=#REF!+1");
  });
  it("leaves string literals untouched", () => {
    expect(shiftFormula('="A1"&A1', 0, 1)).toBe('="A1"&A2');
    expect(shiftFormula('="say ""B2"""&B2', 1, 0)).toBe('="say ""B2"""&C2');
  });
  it("shifts both ends of a range", () => {
    expect(shiftFormula("=SUM(A1:B5)", 0, 2)).toBe("=SUM(A3:B7)");
    expect(shiftFormula("=SUM($A$1:B$5)", 1, 1)).toBe("=SUM($A$1:C$5)");
  });
  it("a range with an endpoint off-sheet becomes #REF!", () => {
    expect(shiftFormula("=SUM(A1:B2)", 0, -1)).toBe("=SUM(#REF!)");
  });
  it("does not treat function names as refs", () => {
    expect(shiftFormula("=LOG10(A1)+ATAN2(B1,C1)", 1, 0)).toBe("=LOG10(B1)+ATAN2(C1,D1)");
    expect(shiftFormula("=LOG10 (A1)", 0, 1)).toBe("=LOG10 (A2)");
  });
  it("handles lower case and AA columns", () => {
    expect(shiftFormula("=a1+Z1", 1, 0)).toBe("=b1+AA1");
  });
  it("leaves numbers, names and non-formulas alone", () => {
    expect(shiftFormula("=1E5+TRUE+A1", 0, 1)).toBe("=1E5+TRUE+A2");
    expect(shiftFormula("A1", 1, 1)).toBe("A1");
    expect(shiftFormula("'=A1", 1, 1)).toBe("'=A1");
    expect(shiftFormula("", 1, 1)).toBe("");
  });
  it("does not shift a sheet-name prefix", () => {
    expect(shiftFormula("=Q1!A1+'My B2'!B2", 0, 1)).toBe("=Q1!A2+'My B2'!B3");
  });
});
