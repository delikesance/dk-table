import { describe, expect, it } from "vitest";
import { createSheet, getDisplay, setCell } from "./sheet";

/** Evaluate `f` in Z1 of a sheet holding `cells`. */
function ev(f: string, cells: Record<string, string> = {}): string {
  const s = createSheet();
  for (const [k, v] of Object.entries(cells)) setCell(s, k, v);
  setCell(s, "Z1", f);
  return getDisplay(s, "Z1");
}

describe("joining", () => {
  it("CONCATENATE", () => {
    expect(ev('=CONCATENATE("a",1,"b")')).toBe("a1b");
    expect(ev('=CONCATENATE("a",1/0)')).toBe("#DIV/0!");
  });
  it("TEXTJOIN with and without empties", () => {
    const c = { A1: "a", A3: "c" };
    expect(ev('=TEXTJOIN("-",TRUE,A1:A3)', c)).toBe("a-c");
    expect(ev('=TEXTJOIN("-",FALSE,A1:A3)', c)).toBe("a--c");
    expect(ev('=TEXTJOIN(", ",1,"x",A1)', c)).toBe("x, a");
    expect(ev('=TEXTJOIN("-")')).toBe("#VALUE!");
  });
});

describe("case and comparison", () => {
  it("PROPER", () => {
    expect(ev('=PROPER("jean-PIERRE dupont")')).toBe("Jean-Pierre Dupont");
    expect(ev('=PROPER("élan 2x")')).toBe("Élan 2X");
  });
  it("EXACT is case-sensitive", () => {
    expect(ev('=EXACT("a","a")')).toBe("TRUE");
    expect(ev('=EXACT("a","A")')).toBe("FALSE");
    expect(ev('=EXACT(1,"1")')).toBe("TRUE");
  });
});

describe("replace and search", () => {
  it("SUBSTITUTE all or one instance", () => {
    expect(ev('=SUBSTITUTE("a-b-c","-","+")')).toBe("a+b+c");
    expect(ev('=SUBSTITUTE("a-b-c","-","+",2)')).toBe("a-b+c");
    expect(ev('=SUBSTITUTE("abc","","x")')).toBe("abc");
    expect(ev('=SUBSTITUTE("abc","b","x",0)')).toBe("#VALUE!");
  });
  it("REPLACE by position", () => {
    expect(ev('=REPLACE("abcdef",2,3,"X")')).toBe("aXef");
    expect(ev('=REPLACE("abc",0,1,"X")')).toBe("#VALUE!");
  });
  it("FIND is case-sensitive, SEARCH is not and supports wildcards", () => {
    expect(ev('=FIND("b","abcb")')).toBe("2");
    expect(ev('=FIND("b","abcb",3)')).toBe("4");
    expect(ev('=FIND("B","abc")')).toBe("#VALUE!");
    expect(ev('=SEARCH("B","abc")')).toBe("2");
    expect(ev('=SEARCH("c?e","abcdef")')).toBe("3");
    expect(ev('=SEARCH("b*d","abcdef")')).toBe("2");
    expect(ev('=SEARCH("z","abc")')).toBe("#VALUE!");
    expect(ev('=FIND("a","abc",9)')).toBe("#VALUE!");
  });
});

describe("misc", () => {
  it("REPT", () => {
    expect(ev('=REPT("ab",3)')).toBe("ababab");
    expect(ev('=REPT("ab",0)')).toBe("");
    expect(ev('=REPT("ab",-1)')).toBe("#VALUE!");
  });
  it("VALUE parses numbers (dot, comma, percent)", () => {
    expect(ev('=VALUE("12.5")')).toBe("12.5");
    expect(ev('=VALUE("1,5")')).toBe("1.5");
    expect(ev('=VALUE("50%")')).toBe("0.5");
    expect(ev('=VALUE("abc")')).toBe("#VALUE!");
  });
  it("CHAR / CODE", () => {
    expect(ev("=CHAR(65)")).toBe("A");
    expect(ev("=CHAR(0)")).toBe("#VALUE!");
    expect(ev("=CHAR(256)")).toBe("#VALUE!");
    expect(ev('=CODE("A")')).toBe("65");
    expect(ev('=CODE("")')).toBe("#VALUE!");
  });
});
