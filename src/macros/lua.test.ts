import { describe, expect, it } from "vitest";
import { createSheet, getDisplay, getRaw, getRangeValues, getValue, setCell, type Sheet } from "../engine/sheet";
import { runMacro, type MacroHost } from "./lua";

/** Host backed by a real engine sheet, recording selection changes. */
function host(sheet: Sheet = createSheet()): MacroHost & { sheet: Sheet; sel: string } {
  const h = {
    sheet, sel: "A1",
    getValue: (r: string) => getValue(sheet, r),
    getDisplay: (r: string) => getDisplay(sheet, r),
    getRaw: (r: string) => getRaw(sheet, r),
    getRangeValues: (r: string) => getRangeValues(sheet, r),
    setCell: (r: string, raw: string) => setCell(sheet, r, raw),
    selection: () => h.sel,
    select: (r: string) => { h.sel = r; },
    sheetName: () => "Feuille 1",
  };
  return h;
}

describe("runMacro", () => {
  it("reads and writes cells through the sheet API, recalculating dependents", () => {
    const h = host();
    setCell(h.sheet, "A1", "2");
    setCell(h.sheet, "B1", "=A1*10");
    const r = runMacro('sheet.setCell("A1", sheet.getValue("A1") + 1)', h);
    expect(r.ok).toBe(true);
    expect(getValue(h.sheet, "B1")).toBe(30);
  });

  it("writes formulas, strings, booleans and clears with nil", () => {
    const h = host();
    setCell(h.sheet, "D1", "x");
    runMacro('sheet.setCell("A1", "=1+1") sheet.setCell("B1", "abc") sheet.setCell("C1", true) sheet.setCell("D1", nil)', h);
    expect(getValue(h.sheet, "A1")).toBe(2);
    expect(getRaw(h.sheet, "B1")).toBe("abc");
    expect(getRaw(h.sheet, "C1")).toBe("TRUE");
    expect(getRaw(h.sheet, "D1")).toBe("");
  });

  it("exposes getRaw, getDisplay and getRangeValues as a Lua array", () => {
    const h = host();
    ["1", "2", "3"].forEach((v, i) => setCell(h.sheet, `A${i + 1}`, v));
    setCell(h.sheet, "B1", "=SUM(A1:A3)");
    const r = runMacro(
      'local t = sheet.getRangeValues("A1:A3") print(#t, t[1] + t[3], sheet.getRaw("B1"), sheet.getDisplay("B1"))', h);
    expect(r.output).toEqual(["3\t4\t=SUM(A1:A3)\t6"]);
  });

  it("accepts method-call syntax (sheet:getValue)", () => {
    const h = host();
    setCell(h.sheet, "A1", "5");
    expect(runMacro('print(sheet:getValue("A1"))', h).output).toEqual(["5"]);
  });

  it("gives selection, select and sheet name", () => {
    const h = host();
    const r = runMacro('print(sheet.selection(), sheet.name()) sheet.select("C3")', h);
    expect(r.output).toEqual(["A1\tFeuille 1"]);
    expect(h.sel).toBe("C3");
  });

  it("returns empty string for empty cells and error codes as strings", () => {
    const h = host();
    setCell(h.sheet, "A1", "=1/0");
    expect(runMacro('print(sheet.getValue("Z9") == "", sheet.getValue("A1"))', h).output).toEqual(["true\t#DIV/0!"]);
  });

  it("reports syntax and runtime errors with a line number", () => {
    const syntax = runMacro("local x = \nif", host());
    expect(syntax.ok).toBe(false);
    expect(syntax.error).toMatch(/^Ligne 2 :/);
    const rt = runMacro('print("a")\nerror("boom")', host());
    expect(rt.ok).toBe(false);
    expect(rt.output).toEqual(["a"]);
    expect(rt.error).toBe("Ligne 2 : boom");
  });

  it("stops infinite loops", () => {
    const r = runMacro("while true do end", host(), { maxSteps: 100_000 });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/limite/);
  });

  it("sandboxes the environment (no io, os.execute, require)", () => {
    const r = runMacro("print(io, os.execute, require, os.time() > 0, string.upper('a'), math.max(1, 2))", host());
    expect(r.output).toEqual(["nil\tnil\tnil\ttrue\tA\t2"]);
  });

  it("supports loops writing many cells", () => {
    const h = host();
    runMacro('for i = 1, 10 do sheet.setCell("A" .. i, i * i) end', h);
    expect(getValue(h.sheet, "A10")).toBe(100);
  });
});
