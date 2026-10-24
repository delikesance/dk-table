import { describe, expect, it } from "vitest";
import { getRaw, setCell } from "../engine/sheet";
import { newEntry, step, type Entry } from "./model";
import { sortColumn } from "./sort";

/** Entry filled from rows of raw strings starting at A1 (empty string = no cell). */
function make(rows: string[][]): Entry {
  const e = newEntry("S");
  rows.forEach((r, i) => r.forEach((v, j) => v && setCell(e.sheet, String.fromCharCode(65 + j) + (i + 1), v)));
  return e;
}
const col = (e: Entry, c: string, n: number) => Array.from({ length: n }, (_, i) => getRaw(e.sheet, c + (i + 1)));

describe("sortColumn", () => {
  it("sorts A-Z then Z-A, header kept, rows move whole", () => {
    const e = make([["Nom", "Age"], ["b", "2"], ["c", "3"], ["a", "1"]]);
    expect(sortColumn(e, "A2", { desc: false })).toBe(true);
    expect(col(e, "A", 4)).toEqual(["Nom", "a", "b", "c"]);
    expect(col(e, "B", 4)).toEqual(["Age", "1", "2", "3"]);
    sortColumn(e, "A2", { desc: true });
    expect(col(e, "A", 4)).toEqual(["Nom", "c", "b", "a"]);
  });
  it("numbers before text, empties last", () => {
    const e = make([["Nom", "x"], ["z", "1"], ["", "2"], ["5", "3"], ["a", "4"]]);
    sortColumn(e, "A2", { desc: false });
    expect(col(e, "A", 5)).toEqual(["Nom", "5", "a", "z", ""]);
    expect(col(e, "B", 5)).toEqual(["x", "3", "4", "1", "2"]);
  });
  it("styles follow rows", () => {
    const e = make([["c"], ["b"], ["a"]]);
    e.styles.A1 = { bold: true };
    sortColumn(e, "A2", { desc: false });
    expect(e.styles.A3).toEqual({ bold: true });
    expect(e.styles.A1).toBeUndefined();
  });
  it("one undo restores everything", () => {
    const e = make([["Nom", "n"], ["b", "2"], ["a", "1"]]);
    e.styles.A2 = { bold: true };
    sortColumn(e, "A2", { desc: false });
    expect(step(e, "undo")).toBe(true);
    expect(col(e, "A", 3)).toEqual(["Nom", "b", "a"]);
    expect(e.styles.A2).toEqual({ bold: true });
    expect(e.undo.length).toBe(0);
  });
  it("empty column or single-row block: no effect, no undo step", () => {
    const e = make([["x"], ["", "y"]]);
    expect(sortColumn(e, "C5", { desc: false })).toBe(false);
    const f = make([["only", "row"]]);
    expect(sortColumn(f, "A1", { desc: false })).toBe(false);
    expect(e.undo.length + f.undo.length).toBe(0);
  });
});
