import { describe, expect, it } from "vitest";
import { createSheet, getDisplay, setCell } from "./sheet";

/** A1:A6 = 2, 4, 4, 4, 5, 5 ; A7 = text ; B1:B3 = 7, (empty), "" formula. */
const DATA: Record<string, string> = {
  A1: "2", A2: "4", A3: "4", A4: "4", A5: "5", A6: "5", A7: "x", B1: "7", B3: '=""',
};

/** Evaluate `f` in Z1 of a sheet holding DATA plus `extra`. */
function ev(f: string, extra: Record<string, string> = {}): string {
  const s = createSheet();
  for (const [k, v] of Object.entries({ ...DATA, ...extra })) setCell(s, k, v);
  setCell(s, "Z1", f);
  return getDisplay(s, "Z1");
}

describe("COUNTBLANK", () => {
  it("counts empty cells and empty text", () => {
    expect(ev("=COUNTBLANK(B1:B4)")).toBe("3");
    expect(ev("=COUNTBLANK(A1:A3)")).toBe("0");
  });
});

describe("MODE", () => {
  it("most frequent number, first on ties", () => {
    expect(ev("=MODE(A1:A7)")).toBe("4");
    expect(ev("=MODE(5,5,4,4)")).toBe("5");
  });
  it("no repeat -> #N/A", () => expect(ev("=MODE(1,2,3)")).toBe("#N/A"));
});

describe("VAR / STDEV (sample)", () => {
  it("values", () => {
    expect(ev("=VAR(A1:A6)")).toBe("1.2");
    expect(ev("=STDEV(2,4,4,4,5,5,7,9)")).toBe("2.1380899353");
  });
  it("fewer than 2 numbers -> #DIV/0!", () => {
    expect(ev("=VAR(1)")).toBe("#DIV/0!");
    expect(ev("=STDEV(A7:A7)")).toBe("#DIV/0!");
  });
});

describe("LARGE / SMALL", () => {
  it("k-th value", () => {
    expect(ev("=LARGE(A1:A6,1)")).toBe("5");
    expect(ev("=LARGE(A1:A6,3)")).toBe("4");
    expect(ev("=SMALL(A1:A6,1)")).toBe("2");
    expect(ev("=SMALL(A1:A6,2)")).toBe("4");
  });
  it("k out of range -> #NUM!", () => {
    expect(ev("=LARGE(A1:A6,0)")).toBe("#NUM!");
    expect(ev("=SMALL(A1:A6,7)")).toBe("#NUM!");
  });
});

describe("RANK", () => {
  it("descending by default, ascending with order<>0, ties share rank", () => {
    expect(ev("=RANK(5,A1:A6)")).toBe("1");
    expect(ev("=RANK(4,A1:A6)")).toBe("3");
    expect(ev("=RANK(2,A1:A6)")).toBe("6");
    expect(ev("=RANK(2,A1:A6,1)")).toBe("1");
    expect(ev("=RANK(5,A1:A6,1)")).toBe("5");
  });
  it("absent value -> #N/A", () => expect(ev("=RANK(3,A1:A6)")).toBe("#N/A"));
});
