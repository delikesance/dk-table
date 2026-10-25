import { describe, it, expect } from "vitest";
import { sortRows } from "./sort";

const LIST = ["Bas", "Moyen", "Haut"];
const col = (rows: string[][]) => rows.map((r) => r[0]);

describe("sortRows: liste personnalisée", () => {
  it("ordonne par position dans la liste", () => {
    const block = [["Haut"], ["Bas"], ["Moyen"]];
    expect(col(sortRows(block, { col: 0, list: LIST }).rows)).toEqual(["Bas", "Moyen", "Haut"]);
  });
  it("décroissant: ordre inverse de la liste", () => {
    const block = [["Bas"], ["Haut"], ["Moyen"]];
    expect(col(sortRows(block, { col: 0, list: LIST, desc: true }).rows)).toEqual(["Haut", "Moyen", "Bas"]);
  });
  it("valeurs absentes de la liste après celles de la liste, triées normalement", () => {
    const block = [["Zèbre"], ["Haut"], ["Abricot"], ["Bas"]];
    expect(col(sortRows(block, { col: 0, list: LIST }).rows)).toEqual(["Bas", "Haut", "Abricot", "Zèbre"]);
  });
  it("insensible à la casse et aux espaces", () => {
    const block = [["haut "], [" BAS"]];
    expect(col(sortRows(block, { col: 0, list: LIST }).rows)).toEqual([" BAS", "haut "]);
  });
  it("les vides restent en bas", () => {
    const block = [[""], ["Haut"], ["Bas"]];
    expect(col(sortRows(block, { col: 0, list: LIST }).rows)).toEqual(["Bas", "Haut", ""]);
  });
});
