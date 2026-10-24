import { describe, it, expect } from "vitest";
import { createSheet, setCell, getRaw, getValue, getDisplay, getRangeValues } from "./sheet";
import { registerFunction } from "./functions";

/** Build a sheet from a key->raw map. */
function mk(init: Record<string, string> = {}) {
  const s = createSheet();
  for (const [k, v] of Object.entries(init)) setCell(s, k, v);
  return s;
}
const val = (s: ReturnType<typeof mk>, k: string) => getDisplay(s, k);

describe("createSheet", () => {
  it("returns an empty 26x100 sheet", () => {
    expect(createSheet()).toEqual({ cols: 26, rows: 100, cells: {} });
  });
});

describe("cells", () => {
  it("stores raw, parses numbers and text", () => {
    const s = mk({ A1: "12", A2: "hello", A3: "" });
    expect(getRaw(s, "A1")).toBe("12");
    expect(getValue(s, "A1")).toBe(12);
    expect(getValue(s, "A2")).toBe("hello");
    expect(getValue(s, "A3")).toBe("");
    expect(s.cells["A3"]).toBeUndefined();
    expect(getRaw(s, "Z9")).toBe("");
  });
});

describe("formulas", () => {
  it("evaluates operators and precedence", () => {
    const s = mk({ A1: "=1+2*3", A2: "=(1+2)*3", A3: "=2^3^2", A4: "=-2^2", A5: "=50%", A6: "=10/4" });
    expect(getValue(s, "A1")).toBe(7);
    expect(getValue(s, "A2")).toBe(9);
    expect(getValue(s, "A3")).toBe(64);
    expect(getValue(s, "A4")).toBe(4);
    expect(getValue(s, "A5")).toBe(0.5);
    expect(getValue(s, "A6")).toBe(2.5);
  });
  it("handles strings and comparisons", () => {
    const s = mk({ A1: '="a"&"b"', A2: "=1<2", A3: "=2<>2", A4: '="x"="X"' });
    expect(val(s, "A1")).toBe("ab");
    expect(val(s, "A2")).toBe("TRUE");
    expect(val(s, "A3")).toBe("FALSE");
    expect(val(s, "A4")).toBe("TRUE");
  });
  it("references and empty cells", () => {
    const s = mk({ A1: "5", B1: "=A1*2", C1: "=Z99+1" });
    expect(getValue(s, "B1")).toBe(10);
    expect(getValue(s, "C1")).toBe(1);
  });
});

describe("functions", () => {
  const s = mk({ A1: "1", A2: "2", A3: "3", A4: "x", A5: "" });
  it("aggregates over ranges", () => {
    setCell(s, "B1", "=SUM(A1:A5)");
    setCell(s, "B2", "=AVERAGE(A1:A3)");
    setCell(s, "B3", "=MIN(A1:A3,0)");
    setCell(s, "B4", "=MAX(A1:A3)");
    setCell(s, "B5", "=COUNT(A1:A5)");
    expect([1, 2, 3, 4, 5].map((i) => getValue(s, "B" + i))).toEqual([6, 2, 0, 3, 3]);
  });
  it("IF ROUND ABS CONCAT", () => {
    setCell(s, "C1", '=IF(A1>0,"pos","neg")');
    setCell(s, "C2", "=ROUND(2.567,2)");
    setCell(s, "C3", "=ABS(-4)");
    setCell(s, "C4", '=CONCAT("a",A1,"b")');
    setCell(s, "C5", "=IF(A1=1,1,1/0)");
    expect([1, 2, 3, 4, 5].map((i) => val(s, "C" + i))).toEqual(["pos", "2.57", "4", "a1b", "1"]);
  });
  it("registerFunction plugs custom fn with flattened numbers", () => {
    registerFunction("DOUBLES", (n) => n.map((x) => x * 2).join("|"));
    setCell(s, "D1", "=DOUBLES(A1:A3)");
    expect(val(s, "D1")).toBe("2|4|6");
    expect(getRangeValues(s, "A1:A5")).toEqual([1, 2, 3]);
  });
});

describe("errors", () => {
  it("emits error codes", () => {
    const s = mk({ A1: "=1/0", A2: "=NOPE(1)", A3: "=A1+1", A4: "=A200", A5: '="a"+1', A6: "=1+" });
    expect(val(s, "A1")).toBe("#DIV/0!");
    expect(val(s, "A2")).toBe("#NAME?");
    expect(val(s, "A3")).toBe("#DIV/0!");
    expect(val(s, "A4")).toBe("#REF!");
    expect(val(s, "A5")).toBe("#VALUE!");
    expect(val(s, "A6")).toBe("#VALUE!");
  });
});

describe("recalc", () => {
  it("updates dependents automatically, transitively", () => {
    const s = mk({ A1: "1", B1: "=A1+1", C1: "=B1+1", D1: "=SUM(A1:C1)" });
    expect(getValue(s, "D1")).toBe(6);
    setCell(s, "A1", "10");
    expect(getValue(s, "C1")).toBe(12);
    expect(getValue(s, "D1")).toBe(33);
  });
  it("handles diamond and rewired deps", () => {
    const s = mk({ A1: "1", B1: "=A1", B2: "=A1", C1: "=B1+B2" });
    setCell(s, "A1", "4");
    expect(getValue(s, "C1")).toBe(8);
    setCell(s, "C1", "=A1");
    setCell(s, "B1", "100");
    expect(getValue(s, "C1")).toBe(4);
  });
  it("detects cycles and recovers", () => {
    const s = mk({ A1: "=B1", B1: "=A1", C1: "=A1+1", D1: "=D1" });
    expect(val(s, "A1")).toBe("#CYCLE!");
    expect(val(s, "B1")).toBe("#CYCLE!");
    expect(val(s, "C1")).toBe("#CYCLE!");
    expect(val(s, "D1")).toBe("#CYCLE!");
    setCell(s, "B1", "5");
    expect(getValue(s, "A1")).toBe(5);
    expect(getValue(s, "C1")).toBe(6);
  });
  it("recomputes formulas when referenced cell is cleared", () => {
    const s = mk({ A1: "3", B1: "=A1*2" });
    setCell(s, "A1", "");
    expect(getValue(s, "B1")).toBe(0);
  });
});
