import { describe, expect, it } from "vitest";
import { createSheet, getDisplay, setCell } from "./sheet";

/** A = region, B = amount, C = qty. */
const DATA: Record<string, string> = {
  A1: "nord", A2: "sud", A3: "nord", A4: "est",
  B1: "10", B2: "20", B3: "30", B4: "40",
  C1: "1", C2: "2", C3: "3", C4: "4",
};

/** Evaluate `f` in Z1 of a sheet holding DATA plus `extra`. */
function ev(f: string, extra: Record<string, string> = {}): string {
  const s = createSheet();
  for (const [k, v] of Object.entries({ ...DATA, ...extra })) setCell(s, k, v);
  setCell(s, "Z1", f);
  return getDisplay(s, "Z1");
}

describe("AVERAGEIF", () => {
  it("averages avg_range (or range) where the criterion matches", () => {
    expect(ev('=AVERAGEIF(A1:A4,"nord",B1:B4)')).toBe("20");
    expect(ev('=AVERAGEIF(B1:B4,">15")')).toBe("30");
    expect(ev('=AVERAGEIF(A1:A4,"n*",B1:B4)')).toBe("20");
  });
  it("no match -> #DIV/0!", () => expect(ev('=AVERAGEIF(A1:A4,"ouest",B1:B4)')).toBe("#DIV/0!"));
});

describe("AVERAGEIFS", () => {
  it("all criteria", () => {
    expect(ev('=AVERAGEIFS(B1:B4,A1:A4,"nord",C1:C4,">1")')).toBe("30");
    expect(ev('=AVERAGEIFS(B1:B4,A1:A4,"<>nord")')).toBe("30");
  });
  it("errors", () => {
    expect(ev('=AVERAGEIFS(B1:B4,A1:A4,"x")')).toBe("#DIV/0!");
    expect(ev('=AVERAGEIFS(B1:B4,A1:A3,"nord")')).toBe("#VALUE!");
    expect(ev("=AVERAGEIFS(B1:B4,A1:A4)")).toBe("#VALUE!");
  });
});

describe("MINIFS / MAXIFS", () => {
  it("min/max of matching values", () => {
    expect(ev('=MINIFS(B1:B4,A1:A4,"nord")')).toBe("10");
    expect(ev('=MAXIFS(B1:B4,A1:A4,"nord")')).toBe("30");
    expect(ev('=MAXIFS(B1:B4,C1:C4,"<4",A1:A4,"<>nord")')).toBe("20");
  });
  it("no match -> 0, mismatched sizes -> #VALUE!", () => {
    expect(ev('=MINIFS(B1:B4,A1:A4,"x")')).toBe("0");
    expect(ev('=MAXIFS(B1:B4,A1:A2,"nord")')).toBe("#VALUE!");
  });
});
