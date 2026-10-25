import { describe, expect, it } from "vitest";
import { getRaw, setCell } from "../engine/sheet";
import { newEntry, type Entry } from "./model";
import { sortColumn } from "./sort";

/** Entry remplie depuis des lignes de valeurs brutes à partir de A1 (chaîne vide = cellule absente). */
function make(rows: string[][]): Entry {
  const e = newEntry("S");
  rows.forEach((r, i) => r.forEach((v, j) => v && setCell(e.sheet, String.fromCharCode(65 + j) + (i + 1), v)));
  return e;
}
const col = (e: Entry, c: string, n: number) => Array.from({ length: n }, (_, i) => getRaw(e.sheet, c + (i + 1)));

describe("sortColumn avec listes personnalisées", () => {
  const lists = [["Bas", "Moyen", "Haut"]];

  it("ordonne selon la liste utilisateur (position dans la liste)", () => {
    const e = make([["Niveau", "x"], ["Haut", "1"], ["Bas", "2"], ["Moyen", "3"]]);
    expect(sortColumn(e, "A2", { desc: false, lists })).toBe(true);
    expect(col(e, "A", 4)).toEqual(["Niveau", "Bas", "Moyen", "Haut"]);
    expect(col(e, "B", 4)).toEqual(["x", "2", "3", "1"]);
  });

  it("sans liste applicable (aucune valeur commune), tri alphabétique habituel", () => {
    const e = make([["Niveau", "x"], ["Haut", "1"], ["Bas", "2"], ["Moyen", "3"]]);
    sortColumn(e, "A2", { desc: false, lists: [["Un", "Deux"]] });
    expect(col(e, "A", 4)).toEqual(["Niveau", "Bas", "Haut", "Moyen"]);
  });

  it("une valeur hors liste ne bloque pas le tri de la liste", () => {
    const e = make([["Niveau", "x"], ["Haut", "1"], ["Inconnu", "2"], ["Bas", "3"]]);
    sortColumn(e, "A2", { desc: false, lists });
    expect(col(e, "A", 4)).toEqual(["Niveau", "Bas", "Haut", "Inconnu"]);
  });
});
