import { describe, it, expect } from "vitest";
import { createSheet, setCell, getDisplay, getValue, registerFunction } from "./sheet";
import { financeFunctions } from "./fn-finance";

for (const [n, f] of Object.entries(financeFunctions)) registerFunction(n, f);

/** Evaluate a formula in Z1 of a fresh sheet (optional extra cells). */
function ev(formula: string, cells: Record<string, string> = {}) {
  const s = createSheet();
  for (const [k, v] of Object.entries(cells)) setCell(s, k, v);
  setCell(s, "Z1", formula);
  return s;
}
const num = (f: string, c: Record<string, string> = {}) => getValue(ev(f, c), "Z1") as number;

describe("PMT", () => {
  it("rate 0 -> -pv/nper", () => expect(num("=PMT(0,12,1200)")).toBe(-100));
  it("loan 10000 @5%/12 over 60", () => expect(num("=PMT(0.05/12,60,10000)")).toBeCloseTo(-188.71, 2));
  it("type=1 (begin of period)", () => expect(num("=PMT(0.05/12,60,10000,0,1)")).toBeCloseTo(-187.93, 2));
  it("nper 0 -> #NUM!", () => expect(getDisplay(ev("=PMT(0.05,0,100)"), "Z1")).toBe("#NUM!"));
});

describe("NPV", () => {
  it("values as args", () => expect(num("=NPV(0.1,100,100)")).toBeCloseTo(173.55, 2));
  it("range", () => expect(num("=NPV(0.1,A1:A2)", { A1: "100", A2: "100" })).toBeCloseTo(173.55, 2));
});

describe("IRR", () => {
  it("simple", () => expect(num("=IRR(A1:A2)", { A1: "-100", A2: "110" })).toBeCloseTo(0.1, 6));
  it("multi flows", () =>
    expect(num("=IRR(A1:A3)", { A1: "-100", A2: "60", A3: "60" })).toBeCloseTo(0.1307, 3));
  it("no sign change -> #NUM!", () =>
    expect(getDisplay(ev("=IRR(A1:A2)", { A1: "100", A2: "110" }), "Z1")).toBe("#NUM!"));
});
