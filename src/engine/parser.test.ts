/** Unit tests for parser.ts: precedence, parentheses, unary/percent, ranges, strings, errors and collectRefs. */
import { describe, it, expect } from "vitest";
import { parseFormula, collectRefs } from "./parser";
import { createSheet, setCell, getValue } from "./sheet";

/** Evaluate a formula body in Z99 of a fresh sheet. */
function ev(body: string) {
  const s = createSheet();
  setCell(s, "Z99", "=" + body);
  return getValue(s, "Z99");
}

describe("precedence", () => {
  it("* / bind tighter than + -", () => {
    expect(ev("1+2*3")).toBe(7);
    expect(ev("10-4/2")).toBe(8);
  });
  it("is left-associative for - and /", () => {
    expect(ev("10-3-2")).toBe(5);
    expect(ev("100/10/5")).toBe(2);
  });
  it("^ binds tighter than *", () => {
    expect(ev("2*3^2")).toBe(18);
  });
  it("^ is left-associative", () => {
    expect(ev("2^3^2")).toBe(64);
  });
  it("& binds looser than +, comparison loosest", () => {
    expect(ev('1+2&"x"')).toBe("3x");
    expect(ev("1+1=2")).toBe(true);
    expect(ev('"a"&"b"="ab"')).toBe(true);
  });
});

describe("parentheses and unary", () => {
  it("parentheses override precedence", () => {
    expect(ev("(1+2)*3")).toBe(9);
    expect(ev("((2))")).toBe(2);
  });
  it("unary minus/plus, stacked", () => {
    expect(ev("-5")).toBe(-5);
    expect(ev("--5")).toBe(5);
    expect(ev("+5")).toBe(5);
    expect(ev("3+-2")).toBe(1);
    expect(ev("-(1+2)")).toBe(-3);
  });
  it("unary minus binds tighter than ^ (Excel: -2^2 = 4)", () => {
    expect(ev("-2^2")).toBe(4);
  });
  it("percent postfix", () => {
    expect(ev("50%")).toBe(0.5);
    expect(ev("200*10%")).toBe(20);
    expect(ev("50%%")).toBe(0.005);
  });
});

describe("tokens", () => {
  it("numbers: decimals, leading dot, exponent", () => {
    expect(ev("1.5+.5")).toBe(2);
    expect(ev("1e3")).toBe(1000);
  });
  it("strings with escaped quotes", () => {
    expect(ev('"a""b"')).toBe('a"b');
  });
  it("TRUE/FALSE literals, case-insensitive", () => {
    expect(ev("true")).toBe(true);
    expect(ev("False")).toBe(false);
  });
  it("function names are case-insensitive and ';' separates args", () => {
    expect(ev("sum(1;2,3)")).toBe(6);
  });
  it("ignores whitespace", () => {
    expect(ev(" 1 +  2 ")).toBe(3);
  });
});

describe("syntax errors", () => {
  it("throw from parseFormula", () => {
    for (const b of ["", "1+", "(1", "1)", "1 2", '"abc', "1+*2", "A1:", "A1:5", "SUM(1,", "$A$1$", "$$A1", "@"])
      expect(() => parseFormula(b), b).toThrow();
  });
  it("evaluate as #VALUE! in a cell", () => {
    expect(ev("1+")).toEqual({ error: "#VALUE!" });
    expect(ev("(1")).toEqual({ error: "#VALUE!" });
    expect(ev("$$A1")).toEqual({ error: "#VALUE!" });
  });
  it("unknown identifiers are #NAME?, unknown functions too", () => {
    expect(ev("foo")).toEqual({ error: "#NAME?" });
    expect(ev("A01")).toEqual({ error: "#NAME?" });
    expect(ev("NOPE(1)")).toEqual({ error: "#NAME?" });
  });
});

describe("ranges and refs", () => {
  it("builds ref and range nodes (upper-cased)", () => {
    expect(parseFormula("a1")).toEqual({ t: "ref", key: "A1" });
    expect(parseFormula("a1:b2")).toEqual({ t: "range", a: "A1", b: "B2" });
  });
  it("supports AA+ columns", () => {
    expect(parseFormula("AA10")).toEqual({ t: "ref", key: "AA10" });
  });
  it("collectRefs finds refs/ranges through ops, unary and calls", () => {
    const n = parseFormula("-A1+SUM(B1:B3,C1)*(D1%)");
    const r = collectRefs(n).map((x) => (x.t === "ref" ? x.key : x.t === "range" ? x.a + ":" + x.b : "?"));
    expect(r).toEqual(["A1", "B1:B3", "C1", "D1"]);
  });
  it("collectRefs ignores literals", () => {
    expect(collectRefs(parseFormula('1+"x"'))).toEqual([]);
  });
  it("parses $A$1, $A1, A$1 like the plain ref, and mixed ranges", () => {
    for (const r of ["$A$1", "$A1", "A$1", "$a$1"]) expect(parseFormula(r)).toEqual({ t: "ref", key: "A1" });
    expect(parseFormula("SUM($A$1:B$5)")).toEqual({ t: "call", name: "SUM", args: [{ t: "range", a: "A1", b: "B5" }] });
  });
  it("evaluates $ refs identically", () => {
    const s = createSheet();
    setCell(s, "A1", "2");
    setCell(s, "B2", "3");
    setCell(s, "C1", "=$A$1+B$2*$B2+SUM($A$1:$B$2)");
    expect(getValue(s, "C1")).toBe(16);
  });
  it("a bare range as scalar is #VALUE!", () => {
    expect(ev("A1:B2")).toEqual({ error: "#VALUE!" });
  });
});
