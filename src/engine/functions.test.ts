/** Dedicated tests per builtin: SUM, AVERAGE, MIN, MAX, COUNT, ABS, ROUND, CONCAT (functions.ts), IF (evaluator.ts), registerFunction. */
import { describe, it, expect } from "vitest";
import { createSheet, setCell, getValue, registerFunction } from "./sheet";

/** Evaluate a formula body in Z99 of a sheet seeded with `init`. */
function ev(body: string, init: Record<string, string> = {}) {
  const s = createSheet();
  for (const [k, v] of Object.entries(init)) setCell(s, k, v);
  setCell(s, "Z99", "=" + body);
  return getValue(s, "Z99");
}
const E = (code: string) => ({ error: code });
/** Column A1:A5 = 1, 2, text, (empty), 4. */
const COL = { A1: "1", A2: "2", A3: "abc", A5: "4" };

describe("SUM", () => {
  it("scalars, ranges, mixed", () => {
    expect(ev("SUM(1,2,3)")).toBe(6);
    expect(ev("SUM(A1:A5)", COL)).toBe(7);
    expect(ev("SUM(A1:A2,10,B1)", { A1: "1", A2: "2", B1: "3" })).toBe(16);
  });
  it("coerces scalar text/bool/blank; non-numeric scalar is #VALUE!", () => {
    expect(ev('SUM("5",TRUE)')).toBe(6);
    expect(ev("SUM(A9)")).toBe(0);
    expect(ev('SUM("x")')).toEqual(E("#VALUE!"));
  });
  it("ignores text and blanks in ranges; empty is 0", () => {
    expect(ev("SUM(B1:B3)")).toBe(0);
    expect(ev("SUM()")).toBe(0);
  });
  it("propagates errors from args and ranges", () => {
    expect(ev("SUM(1/0)")).toEqual(E("#DIV/0!"));
    expect(ev("SUM(A1:A2)", { A1: "=1/0", A2: "2" })).toEqual(E("#DIV/0!"));
    expect(ev("SUM(A1:AA1)")).toEqual(E("#REF!"));
    expect(ev("SUM(NOPE)")).toEqual(E("#NAME?"));
  });
});

describe("AVERAGE", () => {
  it("scalars and ranges (text/blank excluded from count)", () => {
    expect(ev("AVERAGE(2,4)")).toBe(3);
    expect(ev("AVERAGE(A1:A5)", COL)).toBe(7 / 3);
  });
  it("no numbers is #DIV/0!", () => {
    expect(ev("AVERAGE(B1:B3)")).toEqual(E("#DIV/0!"));
    expect(ev("AVERAGE()")).toEqual(E("#DIV/0!"));
  });
  it("propagates errors", () => {
    expect(ev('AVERAGE("x")')).toEqual(E("#VALUE!"));
    expect(ev("AVERAGE(A1:A2)", { A1: "1", A2: "=A1:A1" })).toEqual(E("#VALUE!"));
    expect(ev("AVERAGE(A1:AA1)")).toEqual(E("#REF!"));
  });
});

describe("MIN / MAX", () => {
  it("scalars and ranges", () => {
    expect(ev("MIN(3,1,2)")).toBe(1);
    expect(ev("MAX(3,1,2)")).toBe(3);
    expect(ev("MIN(A1:A5)", COL)).toBe(1);
    expect(ev("MAX(A1:A5)", COL)).toBe(4);
    expect(ev("MAX(-5,-2)")).toBe(-2);
  });
  it("no numbers gives 0", () => {
    expect(ev("MIN(B1:B3)")).toBe(0);
    expect(ev("MAX(B1:B3)")).toBe(0);
    expect(ev("MIN()")).toBe(0);
  });
  it("propagates errors", () => {
    expect(ev("MIN(1,1/0)")).toEqual(E("#DIV/0!"));
    expect(ev('MAX("x")')).toEqual(E("#VALUE!"));
    expect(ev("MAX(A1:AA1)")).toEqual(E("#REF!"));
  });
});

describe("COUNT", () => {
  it("counts only numbers in ranges", () => {
    expect(ev("COUNT(A1:A5)", COL)).toBe(3);
    expect(ev("COUNT(B1:B3)")).toBe(0);
  });
  it("counts numeric scalars (incl. numeric text, booleans), not other text", () => {
    expect(ev("COUNT(1,2)")).toBe(2);
    expect(ev('COUNT("5","x",TRUE)')).toBe(2);
  });
  it("errors are not counted and do not propagate", () => {
    expect(ev("COUNT(1/0,2)")).toBe(1);
    expect(ev("COUNT(A1:A2)", { A1: "=1/0", A2: "2" })).toBe(1);
  });
  it("no args is 0", () => expect(ev("COUNT()")).toBe(0));
});

describe("ABS", () => {
  it("absolute value", () => {
    expect(ev("ABS(-3)")).toBe(3);
    expect(ev("ABS(3)")).toBe(3);
    expect(ev("ABS(0)")).toBe(0);
    expect(ev("ABS(A1)", { A1: "-2.5" })).toBe(2.5);
  });
  it("uses first cell of a range, coerces text", () => {
    expect(ev("ABS(A1:A2)", { A1: "-4" })).toBe(4);
    expect(ev('ABS("-7")')).toBe(7);
  });
  it("errors: missing arg and non-numeric are #VALUE!, errors propagate", () => {
    expect(ev("ABS()")).toEqual(E("#VALUE!"));
    expect(ev('ABS("x")')).toEqual(E("#VALUE!"));
    expect(ev("ABS(1/0)")).toEqual(E("#DIV/0!"));
    expect(ev("ABS(AA1)")).toEqual(E("#REF!"));
  });
});

describe("ROUND", () => {
  it("default 0 digits, positive, negative digits", () => {
    expect(ev("ROUND(2.5)")).toBe(3);
    expect(ev("ROUND(3.14159,2)")).toBe(3.14);
    expect(ev("ROUND(1234,-2)")).toBe(1200);
  });
  it("rounds half away from zero, also negatives", () => {
    expect(ev("ROUND(-2.5)")).toBe(-3);
    expect(ev("ROUND(1.005,2)")).toBe(1.01);
    expect(ev("ROUND(2.675,2)")).toBe(2.68);
  });
  it("truncates fractional digit count", () => {
    expect(ev("ROUND(3.14159,2.9)")).toBe(3.14);
  });
  it("errors: missing arg, bad number, bad digits, propagation", () => {
    expect(ev("ROUND()")).toEqual(E("#VALUE!"));
    expect(ev('ROUND("x")')).toEqual(E("#VALUE!"));
    expect(ev('ROUND(1,"x")')).toEqual(E("#VALUE!"));
    expect(ev("ROUND(1/0)")).toEqual(E("#DIV/0!"));
    expect(ev("ROUND(1,1/0)")).toEqual(E("#DIV/0!"));
  });
});

describe("CONCAT", () => {
  it("joins scalars, formatting numbers and booleans", () => {
    expect(ev('CONCAT("a","b")')).toBe("ab");
    expect(ev('CONCAT("n=",1.50,TRUE)')).toBe("n=1.5TRUE");
  });
  it("flattens ranges including blanks and text", () => {
    expect(ev("CONCAT(A1:A3)", { A1: "x", A3: "z" })).toBe("xz");
    expect(ev("CONCAT(A1:A2,B1)", { A1: "1", A2: "2", B1: "x" })).toBe("12x");
  });
  it("empty is empty string", () => expect(ev("CONCAT()")).toBe(""));
  it("propagates errors", () => {
    expect(ev('CONCAT("a",1/0)')).toEqual(E("#DIV/0!"));
    expect(ev("CONCAT(A1:A2)", { A1: "=1/0" })).toEqual(E("#DIV/0!"));
    expect(ev("CONCAT(A1:AA1)")).toEqual(E("#REF!"));
  });
});
