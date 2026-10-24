import { describe, expect, it } from "vitest";
import { createSheet, getRaw, getRangeValues, getValue, setCell } from "../engine/sheet";
import { runMacro, sheetApi } from "./macro";

describe("macros Lua", () => {
  it("lit A1 et écrit B1", async () => {
    const s = createSheet();
    setCell(s, "A1", "21");
    const r = await runMacro('setCell("B1", getValue("A1")*2)', sheetApi(s));
    expect(r).toEqual({ ok: true });
    expect(getValue(s, "B1")).toBe(42);
  });
  it("getRaw, getRange et recalcul des dépendants", async () => {
    const s = createSheet();
    ["1", "2", "3"].forEach((v, i) => setCell(s, "A" + (i + 1), v));
    setCell(s, "C1", "=B1+1");
    const code =
      'local t=0 for _,v in ipairs(getRange("A1:A3")) do t=t+v end setCell("B1","="..t) setCell("D1", getRaw("C1"))';
    expect((await runMacro(code, sheetApi(s))).ok).toBe(true);
    expect(getValue(s, "C1")).toBe(7);
    expect(getRaw(s, "D1")).toBe("=B1+1");
    expect(getRangeValues(s, "A1:A3")).toEqual([1, 2, 3]);
  });
  it("erreur Lua -> message français", async () => {
    const r = await runMacro("error('boum')", sheetApi(createSheet()));
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/Erreur de macro.*boum/);
  });
  it("boucle infinie -> délai dépassé", async () => {
    const r = await runMacro("while true do end", sheetApi(createSheet()), { timeoutMs: 200 });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/délai/i);
  });
});
