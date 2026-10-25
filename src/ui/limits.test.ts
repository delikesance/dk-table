// @vitest-environment jsdom
/** Tests des plafonds : avertissements toast, jamais de troncature silencieuse. */
import { beforeEach, describe, expect, it } from "vitest";
import { MAX_CELL_CHARS, checkCells, checkImport, IMPORT_WARN_CELLS } from "./limits";
import { MAX_ROWS } from "./grid/virtual";

const toast = () => document.querySelector(".dk-toast")?.textContent ?? "";
beforeEach(() => { document.body.innerHTML = ""; });

describe("limits", () => {
  it("cellule > 50 000 car. : toast, retourne true", () => {
    expect(checkCells({ A1: "x".repeat(MAX_CELL_CHARS + 1) })).toBe(true);
    expect(toast()).toContain("A1");
    expect(toast()).toContain("50");
  });
  it("cellule normale : rien", () => {
    expect(checkCells({ A1: "x".repeat(MAX_CELL_CHARS) })).toBe(false);
    expect(toast()).toBe("");
  });
  it("ligne au-delà de MAX_ROWS : pas de plafond, rien d'affiché", () => {
    expect(checkCells({ [`A${MAX_ROWS + 1}`]: "1" })).toBe(false);
    expect(toast()).toBe("");
  });
  it("import : plus de lignes que MAX_ROWS n'est pas une troncature", () => {
    expect(checkImport({ cols: 2, rows: MAX_ROWS + 5, cells: { A1: { raw: "1" } } })).toBe(false);
    expect(toast()).toBe("");
  });
  it("import volumineux (cellules) signalé", () => {
    const cells: Record<string, { raw: string }> = {};
    for (let i = 0; i <= IMPORT_WARN_CELLS; i++) cells["A" + (i + 1)] = { raw: "1" };
    expect(checkImport({ cols: 1, rows: 10, cells })).toBe(true);
  });
  it("petit import : rien", () => {
    expect(checkImport({ cols: 1, rows: 3, cells: { A1: { raw: "1" } } })).toBe(false);
    expect(toast()).toBe("");
  });
});
