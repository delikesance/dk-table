/** Undo/redo of the text color style (one step per change). */
import { describe, expect, it } from "vitest";
import { newEntry, pushUndo, step, type Entry } from "./model";

/** Style change as the app does it. */
const style = (e: Entry, k: string, p: object): void => { pushUndo(e); e.styles[k] = { ...e.styles[k], ...p }; };

describe("color undo/redo", () => {
  it("undoes and redoes color in one step each", () => {
    const e = newEntry("S");
    style(e, "A1", { color: "#c00" });
    style(e, "A1", { color: "#00c" });
    step(e, "undo");
    expect(e.styles.A1.color).toBe("#c00");
    step(e, "undo");
    expect(e.styles.A1).toBeUndefined();
    step(e, "redo"); step(e, "redo");
    expect(e.styles.A1.color).toBe("#00c");
  });
  it("clearing with undefined drops color from snapshots", () => {
    const e = newEntry("S");
    style(e, "A1", { color: "#c00" });
    style(e, "A1", { color: undefined });
    step(e, "undo"); step(e, "redo");
    expect(e.styles.A1.color).toBeUndefined();
  });
});
