import { afterEach, describe, expect, it } from "vitest";
import { createSheet, getDisplay, setCell } from "./sheet";
import { setRandom } from "./fn-math2";

/** Evaluate `f` in Z1 of a sheet holding `cells` (address -> raw). */
function ev(f: string, cells: Record<string, string> = {}): string {
  const s = createSheet();
  for (const [k, v] of Object.entries(cells)) setCell(s, k, v);
  setCell(s, "Z1", f);
  return getDisplay(s, "Z1");
}

afterEach(() => setRandom(Math.random));

describe("rounding", () => {
  it("ROUNDUP / ROUNDDOWN away from / toward zero", () => {
    expect(ev("=ROUNDUP(3.21,1)")).toBe("3.3");
    expect(ev("=ROUNDUP(-3.21,1)")).toBe("-3.3");
    expect(ev("=ROUNDUP(1234,-2)")).toBe("1300");
    expect(ev("=ROUNDDOWN(3.29,1)")).toBe("3.2");
    expect(ev("=ROUNDDOWN(-3.29)")).toBe("-3");
    expect(ev("=ROUNDUP(2.3)")).toBe("3");
    expect(ev("=ROUNDUP(0.1*3,1)")).toBe("0.3");
  });
  it("INT floors, TRUNC truncates", () => {
    expect(ev("=INT(8.9)")).toBe("8");
    expect(ev("=INT(-8.1)")).toBe("-9");
    expect(ev("=TRUNC(-8.9)")).toBe("-8");
    expect(ev("=TRUNC(3.456,2)")).toBe("3.45");
    expect(ev('=INT("x")')).toBe("#VALUE!");
  });
  it("CEILING / FLOOR to a multiple", () => {
    expect(ev("=CEILING(2.5,1)")).toBe("3");
    expect(ev("=CEILING(-2.5,2)")).toBe("-2");
    expect(ev("=CEILING(-2.5,-2)")).toBe("-4");
    expect(ev("=CEILING(1.5,0.1)")).toBe("1.5");
    expect(ev("=CEILING(2.5,0)")).toBe("0");
    expect(ev("=CEILING(2.5,-1)")).toBe("#NUM!");
    expect(ev("=FLOOR(2.5,1)")).toBe("2");
    expect(ev("=FLOOR(-2.5,2)")).toBe("-4");
    expect(ev("=FLOOR(-2.5,-2)")).toBe("-2");
    expect(ev("=FLOOR(2.5,0)")).toBe("#DIV/0!");
    expect(ev("=FLOOR(2.5,-1)")).toBe("#NUM!");
  });
  it("SIGN", () => {
    expect(ev("=SIGN(-4)")).toBe("-1");
    expect(ev("=SIGN(0)")).toBe("0");
    expect(ev("=SIGN(2)")).toBe("1");
  });
});

describe("powers and logs", () => {
  it("POWER / SQRT / EXP", () => {
    expect(ev("=POWER(2,10)")).toBe("1024");
    expect(ev("=POWER(0,-1)")).toBe("#DIV/0!");
    expect(ev("=POWER(-8,0.5)")).toBe("#NUM!");
    expect(ev("=SQRT(16)")).toBe("4");
    expect(ev("=SQRT(-1)")).toBe("#NUM!");
    expect(ev("=EXP(0)")).toBe("1");
    expect(ev("=EXP(1000)")).toBe("#NUM!");
  });
  it("LN / LOG / LOG10", () => {
    expect(ev("=LN(EXP(2))")).toBe("2");
    expect(ev("=LN(0)")).toBe("#NUM!");
    expect(ev("=LOG(100)")).toBe("2");
    expect(ev("=LOG(8,2)")).toBe("3");
    expect(ev("=LOG(8,1)")).toBe("#DIV/0!");
    expect(ev("=LOG(-1)")).toBe("#NUM!");
    expect(ev("=LOG10(1000)")).toBe("3");
  });
  it("PI", () => expect(ev("=PI()")).toBe("3.14159265359"));
});

describe("random", () => {
  it("RAND in [0,1), RANDBETWEEN inclusive integers", () => {
    setRandom(() => 0.5);
    expect(ev("=RAND()")).toBe("0.5");
    expect(ev("=RANDBETWEEN(1,10)")).toBe("6");
    setRandom(() => 0.999999);
    expect(ev("=RANDBETWEEN(1,10)")).toBe("10");
    expect(ev("=RANDBETWEEN(5,1)")).toBe("#NUM!");
  });
});

describe("SUMPRODUCT", () => {
  const c = { A1: "1", A2: "2", A3: "3", B1: "4", B2: "x", B3: "6" };
  it("multiplies element-wise and sums (text = 0)", () => {
    expect(ev("=SUMPRODUCT(A1:A3,B1:B3)", c)).toBe("22");
    expect(ev("=SUMPRODUCT(A1:A3)", c)).toBe("6");
  });
  it("size mismatch -> #VALUE!, errors propagate", () => {
    expect(ev("=SUMPRODUCT(A1:A3,B1:B2)", c)).toBe("#VALUE!");
    expect(ev("=SUMPRODUCT(A1:A2,C1:C2)", { ...c, C1: "=1/0" })).toBe("#DIV/0!");
  });
});
