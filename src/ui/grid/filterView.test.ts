import { describe, it, expect } from "vitest";
import { visibleRows, rowTracks, stepRow } from "./filterView";

// 6 lignes, colonne 0 = valeurs, ligne 0 = en-tête
const col = ["Nom", "a", "b", "a", "", "c"];
const disp = (c: number, r: number) => (c === 0 ? col[r] : "");

describe("visibleRows", () => {
  it("sans filtre -> null (tout visible)", () => {
    expect(visibleRows({}, 6, disp)).toBeNull();
  });
  it("garde l'en-tête (ligne 0) et les valeurs cochées", () => {
    expect(visibleRows({ 0: ["a"] }, 6, disp)).toEqual([0, 1, 3]);
  });
  it("« (Vides) » sélectionne les cellules vides", () => {
    expect(visibleRows({ 0: ["(Vides)"] }, 6, disp)).toEqual([0, 4]);
  });
  it("plusieurs colonnes: ET logique", () => {
    const d = (c: number, r: number) => (c === 0 ? col[r] : r % 2 ? "x" : "y");
    expect(visibleRows({ 0: ["a", "b"], 1: ["x"] }, 6, d)).toEqual([0, 1, 3]);
  });
});

describe("rowTracks", () => {
  it("sans masque: pistes uniformes", () => {
    expect(rowTracks(5, null)).toBe("var(--col-header-h) repeat(5, 28px)");
  });
  it("lignes masquées à 0px, regroupées", () => {
    expect(rowTracks(5, [0, 3, 4])).toBe("var(--col-header-h) repeat(1, 28px) repeat(2, 0px) repeat(2, 28px)");
  });
});

describe("stepRow", () => {
  it("sans masque: borné", () => {
    expect(stepRow(null, 5, 1, 10, false)).toBe(6);
    expect(stepRow(null, 0, -1, 10, false)).toBe(0);
    expect(stepRow(null, 3, 1, 10, true)).toBe(9);
  });
  it("saute les lignes masquées", () => {
    expect(stepRow([0, 3, 4], 0, 1, 10, false)).toBe(3);
    expect(stepRow([0, 3, 4], 4, -1, 10, false)).toBe(3);
    expect(stepRow([0, 3, 4], 4, 1, 10, false)).toBe(4);
    expect(stepRow([0, 3, 4], 0, 1, 10, true)).toBe(4);
  });
});
