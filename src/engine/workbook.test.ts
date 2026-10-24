/** Cross-sheet references: parsing of `Feuille2!A1` / `'Ventes 2026'!B2`, evaluation and cross-sheet recalc. */
import { describe, expect, it } from "vitest";
import { parseFormula } from "./parser";
import { createSheet, getDisplay, getValue, setCell, type Sheet } from "./sheet";
import { bindWorkbook } from "./workbook";

/** Build a workbook of named empty sheets and bind it. */
function book(...names: string[]): Record<string, Sheet> {
  const out: Record<string, Sheet> = {};
  for (const n of names) out[n] = createSheet();
  bindWorkbook(() => Object.entries(out).map(([name, sheet]) => ({ name, sheet })));
  return out;
}

describe("parser: sheet-qualified refs", () => {
  it("parses Feuille2!A1 as an external ref", () => {
    expect(parseFormula("Feuille2!a1")).toEqual({ t: "xref", sheet: "Feuille2", key: "A1" });
  });
  it("parses a qualified range", () => {
    expect(parseFormula("SUM(Feuille2!A1:B3)")).toEqual({
      t: "call", name: "SUM", args: [{ t: "xrange", sheet: "Feuille2", a: "A1", b: "B3" }],
    });
  });
  it("parses quoted names with spaces and '' escapes", () => {
    expect(parseFormula("'Ventes 2026'!B2")).toEqual({ t: "xref", sheet: "Ventes 2026", key: "B2" });
    expect(parseFormula("'L''an'!C1")).toEqual({ t: "xref", sheet: "L'an", key: "C1" });
  });
  it("accepts accented unquoted names", () => {
    expect(parseFormula("Données!A1")).toEqual({ t: "xref", sheet: "Données", key: "A1" });
  });
  it("rejects a qualifier without a cell", () => {
    expect(() => parseFormula("Feuille2!")).toThrow();
    expect(() => parseFormula("'abc")).toThrow();
  });
});

describe("evaluation", () => {
  it("reads a cell and a range of another sheet (case-insensitive name)", () => {
    const b = book("Feuille1", "Feuille2");
    setCell(b.Feuille2, "A1", "2");
    setCell(b.Feuille2, "B3", "5");
    setCell(b.Feuille1, "A1", "=feuille2!A1*10");
    setCell(b.Feuille1, "A2", "=SUM(Feuille2!A1:B3)");
    expect(getValue(b.Feuille1, "A1")).toBe(20);
    expect(getValue(b.Feuille1, "A2")).toBe(7);
  });
  it("quoted sheet names resolve", () => {
    const b = book("Feuille1", "Ventes 2026");
    setCell(b["Ventes 2026"], "B2", "42");
    setCell(b.Feuille1, "A1", "='Ventes 2026'!B2");
    expect(getValue(b.Feuille1, "A1")).toBe(42);
  });
  it("unknown sheet -> #REF!", () => {
    const b = book("Feuille1");
    setCell(b.Feuille1, "A1", "=Nope!A1");
    setCell(b.Feuille1, "A2", "=SUM(Nope!A1:A3)");
    expect(getDisplay(b.Feuille1, "A1")).toBe("#REF!");
    expect(getDisplay(b.Feuille1, "A2")).toBe("#REF!");
  });
  it("an unbound sheet yields #REF! for qualified refs", () => {
    const s = createSheet();
    setCell(s, "A1", "=X!A1");
    expect(getDisplay(s, "A1")).toBe("#REF!");
  });
});

describe("cross-sheet recalc", () => {
  it("an edit on Feuille1 updates formulas on Feuille2 (and their local dependents)", () => {
    const b = book("Feuille1", "Feuille2");
    setCell(b.Feuille2, "A1", "=Feuille1!A1+1");
    setCell(b.Feuille2, "A2", "=A1*2");
    setCell(b.Feuille1, "A1", "4");
    expect(getValue(b.Feuille2, "A1")).toBe(5);
    expect(getValue(b.Feuille2, "A2")).toBe(10);
  });
  it("ranges propagate and chains across three sheets", () => {
    const b = book("A", "B", "C");
    setCell(b.B, "A1", "=SUM(A!A1:A3)");
    setCell(b.C, "A1", "=B!A1*10");
    setCell(b.A, "A2", "3");
    expect(getValue(b.C, "A1")).toBe(30);
  });
  it("a cross-sheet cycle terminates with #CYCLE!", () => {
    const b = book("Feuille1", "Feuille2");
    setCell(b.Feuille1, "A1", "=Feuille2!A1+1");
    setCell(b.Feuille2, "A1", "=Feuille1!A1+1");
    expect(getDisplay(b.Feuille1, "A1")).toBe("#CYCLE!");
    expect(getDisplay(b.Feuille2, "A1")).toBe("#CYCLE!");
  });
  it("renaming the target sheet then re-binding gives #REF! (formulas are not rewritten)", () => {
    const list = [{ name: "Src", sheet: createSheet() }, { name: "Dst", sheet: createSheet() }];
    bindWorkbook(() => list);
    setCell(list[0].sheet, "A1", "1");
    setCell(list[1].sheet, "A1", "=Src!A1");
    list[0].name = "Autre";
    bindWorkbook(() => list);
    expect(getDisplay(list[1].sheet, "A1")).toBe("#REF!");
  });
  it("binding after build recomputes external refs", () => {
    const s1 = createSheet(), s2 = createSheet();
    setCell(s2, "A1", "=Feuille1!A1");
    setCell(s1, "A1", "=Feuille2!B1+1");
    setCell(s2, "B1", "7");
    bindWorkbook(() => [{ name: "Feuille1", sheet: s1 }, { name: "Feuille2", sheet: s2 }]);
    expect(getValue(s1, "A1")).toBe(8);
    expect(getValue(s2, "A1")).toBe(8);
  });
});
