/** Open-ended ranges (`B2:B`, `B:B`, `A:C`, `2:5`): parsing, evaluation on the used range, dependencies. */
import { describe, expect, it } from "vitest";
import { createSheet, getDisplay, getRangeValues, getValue, setCell, bindWorkbook } from "./sheet";
import { parseFormula } from "./parser";
import { rectOf, containsKey } from "./openrange";

const col = (s: ReturnType<typeof createSheet>, c: string, vals: number[], from = 1) =>
  vals.forEach((v, i) => setCell(s, `${c}${from + i}`, String(v)));

describe("parser", () => {
  it("parses open ranges into range nodes", () => {
    expect(parseFormula("SUM(B2:B)")).toMatchObject({ args: [{ t: "range", a: "B2", b: "B" }] });
    expect(parseFormula("SUM($B$2:$B)")).toMatchObject({ args: [{ t: "range", a: "B2", b: "B" }] });
    expect(parseFormula("SUM(b:b)")).toMatchObject({ args: [{ t: "range", a: "B", b: "B" }] });
    expect(parseFormula("SUM(2:5)")).toMatchObject({ args: [{ t: "range", a: "2", b: "5" }] });
    expect(parseFormula("SUM(S!B2:B)")).toMatchObject({ args: [{ t: "xrange", sheet: "S", a: "B2", b: "B" }] });
    expect(parseFormula("SUM('Feuille 1'!A:C)")).toMatchObject({ args: [{ t: "xrange", sheet: "Feuille 1", a: "A", b: "C" }] });
  });
  it("keeps closed ranges and cells untouched", () => {
    expect(parseFormula("SUM(A1:B2)")).toMatchObject({ args: [{ t: "range", a: "A1", b: "B2" }] });
    expect(parseFormula("A1+B2")).toMatchObject({ t: "bin" });
  });
});

describe("rectOf", () => {
  const s = createSheet();
  col(s, "B", [1, 2, 3, 4], 2); // B2:B5
  it("clips an open end to the used rows of the columns", () => {
    expect(rectOf(s, "B2", "B", true)).toEqual({ c1: 2, r1: 2, c2: 2, r2: 5 });
    expect(rectOf(s, "B", "B", true)).toEqual({ c1: 2, r1: 1, c2: 2, r2: 5 });
    expect(rectOf(s, "A", "C", true)).toEqual({ c1: 1, r1: 1, c2: 3, r2: 5 });
    expect(rectOf(s, "3", "4", true)).toEqual({ c1: 1, r1: 3, c2: 2, r2: 4 });
  });
  it("covers the whole sheet when not clipped", () => {
    expect(rectOf(s, "B2", "B", false)).toEqual({ c1: 2, r1: 2, c2: 2, r2: s.rows });
    expect(rectOf(s, "2", "3", false)).toEqual({ c1: 1, r1: 2, c2: s.cols, r2: 3 });
  });
  it("rejects malformed or out-of-bounds forms", () => {
    expect(rectOf(s, "B", "B2", true)).toBeNull();
    expect(rectOf(s, "B", "3", true)).toBeNull();
    expect(rectOf(s, "AAA", "AAA", true)).toBeNull();
    expect(rectOf(s, "B999", "B", true)).toBeNull();
  });
  it("containsKey tests membership regardless of the used range", () => {
    expect(containsKey("B2", "B", "B900")).toBe(true);
    expect(containsKey("B2", "B", "B1")).toBe(false);
    expect(containsKey("B2", "B", "C2")).toBe(false);
    expect(containsKey("A", "C", "C50")).toBe(true);
    expect(containsKey("2", "3", "Z3")).toBe(true);
    expect(containsKey("2", "3", "A4")).toBe(false);
  });
});

describe("evaluation", () => {
  it("SUM(B2:B) starts at B2 and ends at the last used row of B", () => {
    const s = createSheet();
    col(s, "B", [100, 1, 2, 3]);
    setCell(s, "D1", "=SUM(B2:B)");
    expect(getValue(s, "D1")).toBe(6);
  });
  it("recalculates when a cell appears below or is cleared", () => {
    const s = createSheet();
    col(s, "B", [100, 1, 2]);
    setCell(s, "D1", "=SUM(B2:B)");
    setCell(s, "B9", "10");
    expect(getValue(s, "D1")).toBe(13);
    setCell(s, "B9", "");
    expect(getValue(s, "D1")).toBe(3);
    setCell(s, "B1", "50"); // above the start: ignored
    expect(getValue(s, "D1")).toBe(3);
  });
  it("whole columns and rows", () => {
    const s = createSheet();
    col(s, "A", [1, 2]);
    col(s, "B", [3, 4]);
    setCell(s, "F10", "=SUM(A:B)");
    setCell(s, "F11", "=COUNT(B:B)");
    setCell(s, "F12", "=SUM(1:2)");
    setCell(s, "F13", "=SUM(2:2)");
    expect(getValue(s, "F10")).toBe(10);
    expect(getValue(s, "F11")).toBe(2);
    expect(getValue(s, "F12")).toBe(10);
    expect(getValue(s, "F13")).toBe(6);
  });
  it("an empty open range is empty, not an error", () => {
    const s = createSheet();
    setCell(s, "D1", "=SUM(B2:B)");
    expect(getValue(s, "D1")).toBe(0);
  });
  it("matrix functions see the right width", () => {
    const s = createSheet();
    col(s, "A", [1, 2, 3]);
    col(s, "B", [10, 20, 30]);
    setCell(s, "D1", "=VLOOKUP(2;A:B;2;FALSE)");
    expect(getDisplay(s, "D1")).toBe("20");
  });
  it("a bare open range is #VALUE!, a cell range inside the sheet limit is fine", () => {
    const s = createSheet();
    setCell(s, "D1", "=B2:B");
    expect(getDisplay(s, "D1")).toBe("#VALUE!");
  });
  it("getRangeValues accepts open ranges", () => {
    const s = createSheet();
    col(s, "B", [9, 1, 2, 3]);
    expect(getRangeValues(s, "B2:B")).toEqual([1, 2, 3]);
    expect(getRangeValues(s, "b:b")).toEqual([9, 1, 2, 3]);
    expect(getRangeValues(s, "2:3")).toEqual([1, 2]);
  });
});

describe("cross-sheet", () => {
  it("'Feuille 1'!B2:B follows edits of the other sheet", () => {
    const a = createSheet(), b = createSheet();
    bindWorkbook(() => [{ name: "Feuille 1", sheet: a }, { name: "B", sheet: b }]);
    col(a, "B", [9, 1, 2]);
    setCell(b, "A1", "=SUM('Feuille 1'!B2:B)");
    expect(getValue(b, "A1")).toBe(3);
    setCell(a, "B7", "5");
    expect(getValue(b, "A1")).toBe(8);
  });
});
