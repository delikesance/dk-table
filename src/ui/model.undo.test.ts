/**
 * Tests for model undo/redo: 1000-step cap, grouped edit = one step, redo cleared by a
 * new edit, style (incl. fill) undo/redo, switching sheets, isolation between sheets.
 */
import { describe, it, expect } from "vitest";
import { newEntry, pushUndo, step, type Entry } from "./model";
import { setCell, getRaw } from "../engine/sheet";

/** One edit as the app does it: snapshot then mutate. */
const edit = (e: Entry, k: string, raw: string): void => { pushUndo(e); setCell(e.sheet, k, raw); };
/** Style change as the app does it. */
const style = (e: Entry, k: string, p: object): void => { pushUndo(e); e.styles[k] = { ...e.styles[k], ...p }; };

describe("undo limit", () => {
  it("keeps at most 1000 steps, dropping the oldest", () => {
    const e = newEntry("S");
    for (let i = 1; i <= 1005; i++) edit(e, "A1", String(i));
    expect(e.undo.length).toBe(1000);
    let n = 0;
    while (step(e, "undo")) n++;
    expect(n).toBe(1000);
    expect(getRaw(e.sheet, "A1")).toBe("5"); // oldest 5 steps lost
  });
});

describe("grouped edits", () => {
  it("one pushUndo for many cells = one undo step", () => {
    const e = newEntry("S");
    pushUndo(e);
    for (const k of ["A1", "A2", "A3"]) setCell(e.sheet, k, "x");
    expect(e.undo.length).toBe(1);
    step(e, "undo");
    expect(["A1", "A2", "A3"].map((k) => getRaw(e.sheet, k))).toEqual(["", "", ""]);
  });
});

describe("redo", () => {
  it("undo then redo restores the edit", () => {
    const e = newEntry("S");
    edit(e, "A1", "1");
    step(e, "undo");
    expect(getRaw(e.sheet, "A1")).toBe("");
    step(e, "redo");
    expect(getRaw(e.sheet, "A1")).toBe("1");
  });
  it("new edit clears redo", () => {
    const e = newEntry("S");
    edit(e, "A1", "1");
    step(e, "undo");
    expect(e.redo.length).toBe(1);
    edit(e, "A1", "2");
    expect(e.redo.length).toBe(0);
    expect(step(e, "redo")).toBe(false);
  });
  it("returns false on empty stacks", () => {
    const e = newEntry("S");
    expect(step(e, "undo")).toBe(false);
    expect(step(e, "redo")).toBe(false);
  });
});

describe("style undo/redo", () => {
  it("undoes and redoes a background fill", () => {
    const e = newEntry("S");
    style(e, "A1", { fill: "#ff0000" });
    style(e, "A1", { fill: "#00ff00" });
    step(e, "undo");
    expect(e.styles.A1.fill).toBe("#ff0000");
    step(e, "undo");
    expect(e.styles.A1).toBeUndefined();
    step(e, "redo");
    step(e, "redo");
    expect(e.styles.A1.fill).toBe("#00ff00");
  });
  it("restores cells and styles together", () => {
    const e = newEntry("S");
    edit(e, "A1", "9");
    style(e, "A1", { bold: true, fill: "#123456" });
    step(e, "undo");
    expect(getRaw(e.sheet, "A1")).toBe("9");
    expect(e.styles.A1).toBeUndefined();
  });
});

describe("multiple sheets", () => {
  it("histories and data are isolated per sheet", () => {
    const a = newEntry("A"), b = newEntry("B");
    edit(a, "A1", "a");
    style(b, "A1", { fill: "#abcdef" });
    expect(b.undo.length).toBe(1);
    expect(a.undo.length).toBe(1);
    step(a, "undo");
    expect(getRaw(a.sheet, "A1")).toBe("");
    expect(b.styles.A1.fill).toBe("#abcdef");
    expect(b.redo.length).toBe(0);
  });
  it("history survives switching away and back", () => {
    const a = newEntry("A"), b = newEntry("B");
    edit(a, "A1", "1");
    edit(b, "A1", "2"); // "switch" to b
    expect(step(a, "undo")).toBe(true); // back to a
    expect(getRaw(b.sheet, "A1")).toBe("2");
  });
});
