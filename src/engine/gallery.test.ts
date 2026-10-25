/** Tests de engine/gallery.ts : une carte par ligne avec les champs choisis, lignes masquées ignorées. */
import { describe, expect, it } from "vitest";
import { galleryCards } from "./gallery";

const GRID = [
  ["Nom", "Qte", "Ville"],
  ["Ana", "2", "Lyon"],
  ["", "", ""],
  ["Ben", "1", "Nice"],
];

describe("galleryCards", () => {
  it("crée une carte par ligne non vide avec les champs choisis", () => {
    const cards = galleryCards(GRID, [0, 2]);
    expect(cards).toHaveLength(2);
    expect(cards[0]).toEqual({ row: 2, title: "Ana", fields: [{ name: "Ville", value: "Lyon" }] });
    expect(cards[1].row).toBe(4);
  });
  it("sans champ choisi, affiche toutes les colonnes nommées après le titre", () => {
    expect(galleryCards(GRID, [])[0].fields.map((f) => f.name)).toEqual(["Qte", "Ville"]);
  });
  it("respecte le filtre de la vue (lignes masquées)", () => {
    expect(galleryCards(GRID, [0], (r) => r === 2).map((c) => c.row)).toEqual([4]);
  });
});
