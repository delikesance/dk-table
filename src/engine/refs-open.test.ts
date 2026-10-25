/** shiftFormula on open-ended ranges (fill / copy-paste). */
import { describe, expect, it } from "vitest";
import { shiftFormula } from "./refs";

describe("shiftFormula, open ranges", () => {
  it("moves a half-open range by columns and rows", () => {
    expect(shiftFormula("=SUM(B2:B)", 1, 3)).toBe("=SUM(C5:C)");
  });
  it("whole columns shift by columns only, whole rows by rows only", () => {
    expect(shiftFormula("=SUM(B:C)", 1, 5)).toBe("=SUM(C:D)");
    expect(shiftFormula("=SUM(2:5)", 4, 1)).toBe("=SUM(3:6)");
  });
  it("keeps $ parts fixed", () => {
    expect(shiftFormula("=SUM($B$2:$B)", 2, 2)).toBe("=SUM($B$2:$B)");
    expect(shiftFormula("=SUM(B$2:B)", 1, 1)).toBe("=SUM(C$2:C)");
    expect(shiftFormula("=SUM($2:$3)", 0, 4)).toBe("=SUM($2:$3)");
  });
  it("goes to #REF! off the sheet", () => {
    expect(shiftFormula("=SUM(B:B)", -2, 0)).toBe("=SUM(#REF!)");
  });
  it("handles sheet prefixes and leaves closed ranges alone", () => {
    expect(shiftFormula("=SUM('Feuille 1'!B2:B)+SUM(A1:B2)", 1, 1)).toBe("=SUM('Feuille 1'!C3:C)+SUM(B2:C3)");
  });
});
