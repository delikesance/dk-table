/** Freeze entries in Google Sheets wording: up to the row/column of the selection, per-axis release. */
import { describe, expect, it, vi } from "vitest";
import { freezeUpTo, freezeEntries } from "./freezeMenu";
import type { App } from "../appTypes";

const app = (sel: string, freeze = { rows: 0, cols: 0 }) => ({
  selection: () => sel, setFreeze: vi.fn(), getFreeze: () => freeze,
  activeDoc: () => ({ cols: 26, rows: 1000 }),
}) as unknown as App & { setFreeze: ReturnType<typeof vi.fn> };
const labels = (a: App, axis: "rows" | "cols" | "both") => freezeEntries(a, axis).map((e) => e.label);

describe("freezeUpTo", () => {
  it("counts up to the last row/column of the selection", () => {
    expect(freezeUpTo("B2:C5", 26, 1000)).toEqual({ rows: 5, cols: 3 });
    expect(freezeUpTo("D7", 26, 1000)).toEqual({ rows: 7, cols: 4 });
  });
  it("a whole column/row only counts on its own axis", () => {
    expect(freezeUpTo("B1:C1000", 26, 1000)).toEqual({ rows: 1, cols: 3 });
    expect(freezeUpTo("A4:Z6", 26, 1000)).toEqual({ rows: 6, cols: 1 });
  });
});

describe("freezeEntries", () => {
  it("column header: freeze up to the column, keeping frozen rows; release only when frozen", () => {
    const a = app("A1:C1000", { rows: 2, cols: 0 });
    expect(labels(a, "cols")).toEqual(["Figer jusqu'à la colonne C"]);
    freezeEntries(a, "cols")[0].run();
    expect(a.setFreeze).toHaveBeenCalledWith({ rows: 2, cols: 3 });
    const b = app("B1:B1000", { rows: 2, cols: 1 });
    expect(labels(b, "cols")).toEqual(["Figer jusqu'à la colonne B", "Libérer les colonnes"]);
    freezeEntries(b, "cols")[1].run();
    expect(b.setFreeze).toHaveBeenCalledWith({ rows: 2, cols: 0 });
  });
  it("row header: freeze up to the row, release rows", () => {
    const a = app("A5:Z5", { rows: 1, cols: 2 });
    expect(labels(a, "rows")).toEqual(["Figer jusqu'à la ligne 5", "Libérer les lignes"]);
    freezeEntries(a, "rows")[0].run();
    expect(a.setFreeze).toHaveBeenCalledWith({ rows: 5, cols: 2 });
  });
  it("both axes (Affichage menu)", () => {
    expect(labels(app("C3"), "both")).toEqual(["Figer jusqu'à la ligne 3", "Figer jusqu'à la colonne C"]);
  });
});
