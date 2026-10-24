import { describe, expect, it } from "vitest";
import { createSheet, getDisplay, getValue, setCell } from "./sheet";

/** Evaluate `f` in Z1 of a fresh sheet; returns [value, display]. */
function run(f: string): [unknown, string] {
  const s = createSheet();
  setCell(s, "Z1", f);
  return [getValue(s, "Z1"), getDisplay(s, "Z1")];
}
/** Displayed result of `f` (for error codes). */
const disp = (f: string) => run(f)[1];
/** Expect `f` to evaluate to a number close to `x` (6 decimals by default). */
function near(f: string, x: number, digits = 6) {
  const [v] = run(f);
  expect(typeof v, f).toBe("number");
  expect(v as number, f).toBeCloseTo(x, digits);
}

describe("IPMT / PPMT", () => {
  it("IPMT first period", () => near("=IPMT(0.1/12,1,36,8000)", -66.666667));
  it("IPMT last year", () => near("=IPMT(0.1,3,3,8000)", -292.44713));
  it("IPMT type 1: first period is 0, then shifted", () => {
    near("=IPMT(0.1/12,1,36,8000,0,1)", 0);
    near("=IPMT(0.1/12,2,36,8000,0,1)", -64.533299);
  });
  it("PPMT", () => near("=PPMT(0.1/12,1,24,2000)", -75.623186));
  it("IPMT + PPMT = PMT", () => near("=IPMT(0.05/12,7,60,10000)+PPMT(0.05/12,7,60,10000)", -188.712336));
  it("period out of range -> #NUM!", () => {
    expect(disp("=IPMT(0.1,0,3,8000)")).toBe("#NUM!");
    expect(disp("=PPMT(0.1,4,3,8000)")).toBe("#NUM!");
  });
  it("rate 0", () => near("=PPMT(0,1,10,1000)", -100));
  it("too many args -> #VALUE!", () => expect(disp("=IPMT(0.1,1,3,8000,0,0,1)")).toBe("#VALUE!"));
});

describe("PV / FV", () => {
  it("PV annuity", () => near("=PV(0.08/12,240,500)", -59777.145851));
  it("PV rate 0", () => near("=PV(0,10,-100,-50)", 1050));
  it("FV with pv and type 1", () => near("=FV(0.06/12,10,-200,-500,1)", 2581.403374));
  it("FV rate 0", () => near("=FV(0,12,-100)", 1200));
  it("FV simple", () => near("=FV(0.005,12,-100)", 1233.556237));
});

describe("RATE", () => {
  it("monthly rate of a loan", () => near("=RATE(48,-200,8000)", 0.007701472, 8));
  it("with fv and guess", () => near("=RATE(10,0,-1000,2000,0,0.2)", 0.071773463, 8));
  it("rate 0", () => near("=RATE(10,-100,1000)", 0, 8));
  it("no solution -> #NUM!", () => expect(disp("=RATE(10,100,1000)")).toBe("#NUM!"));
});

describe("NPER", () => {
  it("with fv and type 1", () => near("=NPER(0.01,-100,-1000,10000,1)", 59.673866));
  it("rate 0", () => near("=NPER(0,-100,1000)", 10));
  it("negative result allowed (like Excel)", () => near("=NPER(0.1,100,1000)", -7.272541));
  it("impossible -> #NUM!", () => expect(disp("=NPER(0.1,-100,10000)")).toBe("#NUM!"));
});

describe("CUMIPMT / CUMPRINC", () => {
  it("CUMIPMT second year", () => near("=CUMIPMT(0.09/12,360,125000,13,24,0)", -11135.232131));
  it("CUMIPMT first month", () => near("=CUMIPMT(0.09/12,360,125000,1,1,0)", -937.5));
  it("CUMPRINC second year", () => near("=CUMPRINC(0.09/12,360,125000,13,24,0)", -934.107123));
  it("CUMPRINC type 1, first period", () => near("=CUMPRINC(0.09/12,360,125000,1,1,1)", -998.291088));
  it("all args required", () => expect(disp("=CUMIPMT(0.1,10,1000,1,2)")).toBe("#VALUE!"));
  it("Excel validations -> #NUM!", () => {
    for (const f of ["=CUMIPMT(0,10,1000,1,2,0)", "=CUMIPMT(0.1,10,0,1,2,0)", "=CUMIPMT(0.1,10,1000,0,2,0)",
      "=CUMIPMT(0.1,10,1000,3,2,0)", "=CUMPRINC(0.1,10,1000,1,11,0)", "=CUMPRINC(0.1,10,1000,1,2,2)",
      "=CUMPRINC(0.1,0,1000,1,2,0)"])
      expect(disp(f), f).toBe("#NUM!");
  });
});
