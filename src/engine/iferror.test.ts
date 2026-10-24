import { describe, it, expect } from "vitest";
import { createSheet, setCell, getValue } from "./sheet";

/** Evaluate a formula in A1 of a fresh sheet. */
function f(formula: string) {
  const s = createSheet();
  setCell(s, "A1", formula);
  return getValue(s, "A1");
}

describe("IFERROR / IFNA", () => {
  it("replaces errors", () => {
    expect(f('=IFERROR(1/0,"x")')).toBe("x");
    expect(f('=IFERROR(5,"x")')).toBe(5);
    expect(f('=IFERROR(FOO(1),"n")')).toBe("n");
    expect(f('=IFERROR("a"+1,"v")')).toBe("v");
    expect(f('=IFERROR(A99999,"r")')).toBe("r");
  });
  it("catches #CYCLE!", () => {
    const s = createSheet();
    setCell(s, "A1", "=B1+1");
    setCell(s, "B1", "=A1");
    setCell(s, "C1", '=IFERROR(A1,"ok")');
    expect(getValue(s, "C1")).toBe("ok");
  });
  it("is lazy on the fallback", () => {
    expect(f("=IFERROR(5,1/0)")).toBe(5);
    expect(f("=IFNA(5,1/0)")).toBe(5);
  });
  it("IFNA passes through non-#N/A errors (engine has no #N/A)", () => {
    expect(f('=IFNA(1/0,"x")')).toEqual({ error: "#DIV/0!" });
    expect(f('=IFNA(7,"x")')).toBe(7);
  });
  it("checks arity", () => {
    expect(f("=IFERROR(1)")).toEqual({ error: "#VALUE!" });
    expect(f("=IFERROR(1,2,3)")).toEqual({ error: "#VALUE!" });
    expect(f("=IFNA(1)")).toEqual({ error: "#VALUE!" });
  });
});
