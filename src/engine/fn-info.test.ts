import { describe, expect, it } from "vitest";
import { createSheet, getDisplay, setCell } from "./sheet";

/** A1 = 1, A2 = text, A3 = TRUE, A4 = #DIV/0!, A5 = #N/A, A6 empty. */
const DATA: Record<string, string> = { A1: "1", A2: "x", A3: "=TRUE", A4: "=1/0", A5: "=NA()" };

/** Evaluate `f` in Z1 of a sheet holding DATA. */
function ev(f: string): string {
  const s = createSheet();
  for (const [k, v] of Object.entries(DATA)) setCell(s, k, v);
  setCell(s, "Z1", f);
  return getDisplay(s, "Z1");
}

describe("constants", () => {
  it("TRUE() / FALSE() / NA()", () => {
    expect(ev("=TRUE()")).toBe("TRUE");
    expect(ev("=FALSE()")).toBe("FALSE");
    expect(ev("=NA()")).toBe("#N/A");
    expect(ev("=A5")).toBe("#N/A");
  });
});

describe("IS* predicates", () => {
  it("ISERROR / ISERR / ISNA", () => {
    expect(ev("=ISERROR(A4)")).toBe("TRUE");
    expect(ev("=ISERROR(A5)")).toBe("TRUE");
    expect(ev("=ISERROR(A1)")).toBe("FALSE");
    expect(ev("=ISERR(A4)")).toBe("TRUE");
    expect(ev("=ISERR(A5)")).toBe("FALSE");
    expect(ev("=ISNA(A5)")).toBe("TRUE");
    expect(ev("=ISNA(A4)")).toBe("FALSE");
  });
  it("ISTEXT / ISLOGICAL", () => {
    expect(ev("=ISTEXT(A2)")).toBe("TRUE");
    expect(ev("=ISTEXT(A1)")).toBe("FALSE");
    expect(ev("=ISTEXT(A6)")).toBe("FALSE");
    expect(ev("=ISLOGICAL(A3)")).toBe("TRUE");
    expect(ev("=ISLOGICAL(A1)")).toBe("FALSE");
  });
  it("missing argument -> #VALUE!", () => expect(ev("=ISTEXT()")).toBe("#VALUE!"));
});

describe("XOR", () => {
  it("true when an odd number of values are true", () => {
    expect(ev("=XOR(1,0)")).toBe("TRUE");
    expect(ev("=XOR(1,1)")).toBe("FALSE");
    expect(ev("=XOR(1,1,1)")).toBe("TRUE");
    expect(ev('=XOR("x")')).toBe("#VALUE!");
  });
});

describe("IFS (lazy)", () => {
  it("first true condition wins, later branches not evaluated", () => {
    expect(ev('=IFS(A1>5,"a",A1>0,"b",TRUE,"c")')).toBe("b");
    expect(ev('=IFS(TRUE,"ok",1/0,"x")')).toBe("ok");
  });
  it("no true condition -> #N/A, odd args -> #VALUE!, error condition propagates", () => {
    expect(ev('=IFS(A1>5,"a")')).toBe("#N/A");
    expect(ev('=IFS(A1>5,"a",TRUE)')).toBe("#VALUE!");
    expect(ev('=IFS(A4,"a")')).toBe("#DIV/0!");
  });
});

describe("SWITCH (lazy)", () => {
  it("matches values, falls back to default", () => {
    expect(ev('=SWITCH(A1,1,"un",2,"deux")')).toBe("un");
    expect(ev('=SWITCH("B","a",1,"b",2)')).toBe("2");
    expect(ev('=SWITCH(9,1,"un","autre")')).toBe("autre");
    expect(ev('=SWITCH(1,1,"un",2,1/0)')).toBe("un");
  });
  it("no match without default -> #N/A, too few args -> #VALUE!", () => {
    expect(ev('=SWITCH(9,1,"un")')).toBe("#N/A");
    expect(ev("=SWITCH(1,2)")).toBe("#VALUE!");
    expect(ev('=SWITCH(A4,1,"un")')).toBe("#DIV/0!");
  });
});
