/** Dedicated tests for IF (evaluator.ts, lazy branches) and the public registerFunction plug-in API. */
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

describe("IF", () => {
  it("picks branch by boolean, number or TRUE/FALSE text", () => {
    expect(ev('IF(TRUE,"y","n")')).toBe("y");
    expect(ev('IF(0,"y","n")')).toBe("n");
    expect(ev('IF(2>1,"y","n")')).toBe("y");
    expect(ev('IF("false",1,2)')).toBe(2);
    expect(ev("IF(A1,1,2)", { A1: "5" })).toBe(1);
  });
  it("blank condition is false", () => expect(ev("IF(A1,1,2)")).toBe(2));
  it("missing else gives FALSE when condition is false", () => {
    expect(ev("IF(FALSE,1)")).toBe(false);
    expect(ev("IF(TRUE,1)")).toBe(1);
  });
  it("is lazy: untaken branch errors are ignored", () => {
    expect(ev("IF(TRUE,1,1/0)")).toBe(1);
    expect(ev("IF(FALSE,1/0,2)")).toBe(2);
    expect(ev("IF(TRUE,1/0,2)")).toEqual(E("#DIV/0!"));
  });
  it("arity: 0, 1 or 4 args is #VALUE!", () => {
    expect(ev("IF()")).toEqual(E("#VALUE!"));
    expect(ev("IF(TRUE)")).toEqual(E("#VALUE!"));
    expect(ev("IF(TRUE,1,2,3)")).toEqual(E("#VALUE!"));
  });
  it("condition errors: non-boolean text #VALUE!, error propagates", () => {
    expect(ev('IF("x",1,2)')).toEqual(E("#VALUE!"));
    expect(ev("IF(1/0,1,2)")).toEqual(E("#DIV/0!"));
    expect(ev("IF(AA1,1,2)")).toEqual(E("#REF!"));
  });
  it("nests, and is case-insensitive", () => {
    expect(ev("if(FALSE,1,if(TRUE,2,3))")).toBe(2);
  });
});

describe("registerFunction", () => {
  it("registers a case-insensitive plug-in receiving flattened numbers", () => {
    registerFunction("tstsum", (n) => n.reduce((a, b) => a + b, 0) + 0.5);
    expect(ev("TSTSUM(1,2)")).toBe(3.5);
    expect(ev("tstsum(A1:A2,10)", { A1: "1", A2: "2" })).toBe(13.5);
  });
  it("can return text", () => {
    registerFunction("TSTTXT", (n) => `n=${n.length}`);
    expect(ev("TSTTXT(1,2,3)")).toBe("n=3");
  });
  it("ranges skip text/blank, scalar non-numeric text is #VALUE!, errors propagate without calling fn", () => {
    let calls = 0;
    registerFunction("TSTCNT", (n) => { calls++; return n.length; });
    expect(ev("TSTCNT(A1:A5)", COL)).toBe(3);
    const before = calls;
    expect(ev('TSTCNT("x")')).toEqual(E("#VALUE!"));
    expect(ev("TSTCNT(1/0)")).toEqual(E("#DIV/0!"));
    expect(calls).toBe(before);
  });
  it("re-registering replaces the previous function", () => {
    registerFunction("TSTREP", () => 1);
    registerFunction("TSTREP", () => 2);
    expect(ev("TSTREP()")).toBe(2);
  });
  it("unknown function is #NAME? before registration", () => {
    expect(ev("TSTLATE(1)")).toEqual(E("#NAME?"));
    registerFunction("TSTLATE", () => 9);
    expect(ev("TSTLATE(1)")).toBe(9);
  });
});
