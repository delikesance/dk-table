import { describe, expect, it } from "vitest";
import { getRaw, setCell } from "../engine/sheet";
import { newEntry, pushUndo, step } from "./model";

describe("undo/redo with styles", () => {
  it("undo restores previous style, redo reapplies", () => {
    const e = newEntry("S");
    pushUndo(e);
    e.styles.A1 = { bold: true };
    expect(step(e, "undo")).toBe(true);
    expect(e.styles.A1).toBeUndefined();
    expect(step(e, "redo")).toBe(true);
    expect(e.styles.A1).toEqual({ bold: true });
  });
  it("one step restores cells and styles together", () => {
    const e = newEntry("S");
    pushUndo(e);
    setCell(e.sheet, "A1", "5");
    e.styles.A1 = { fill: "#fff" };
    e.styles.B1 = { italic: true };
    step(e, "undo");
    expect(getRaw(e.sheet, "A1")).toBe("");
    expect(e.styles).toEqual({});
    step(e, "redo");
    expect(getRaw(e.sheet, "A1")).toBe("5");
    expect(e.styles).toEqual({ A1: { fill: "#fff" }, B1: { italic: true } });
  });
  it("newEntry loads persisted styles", () => {
    const e = newEntry("S", { styles: { A1: { align: "right" } } });
    expect(e.styles.A1).toEqual({ align: "right" });
  });
  it("snapshots are deep copies", () => {
    const e = newEntry("S");
    e.styles.A1 = { bold: true };
    pushUndo(e);
    e.styles.A1.bold = false;
    step(e, "undo");
    expect(e.styles.A1.bold).toBe(true);
  });
});
