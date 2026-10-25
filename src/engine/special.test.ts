import { describe, expect, it } from "vitest";
import { createSheet, setCell } from "./sheet";
import { specialKeys } from "./special";

/** Feuille de test : A1:C3 utilisé (C3 vide), une erreur, un booléen, du texte, des nombres et des formules. */
function sample() {
  const s = createSheet();
  setCell(s, "A1", "Nom"); setCell(s, "B1", "5"); setCell(s, "C1", "=B1*2");
  setCell(s, "A2", "=1/0"); setCell(s, "B2", "TRUE"); setCell(s, "C2", "=B1>1");
  setCell(s, "A3", "=A1&\"x\""); setCell(s, "B3", "#N/A"); setCell(s, "C3", "");
  return s;
}

describe("specialKeys (Atteindre spécial)", () => {
  it("cellules vides : vides du rectangle utilisé (A1:C3), pas celles hors zone", () => {
    expect(specialKeys(sample(), { kind: "blanks" })).toEqual(["C3"]);
    const s = sample(); setCell(s, "E5", "x"); // zone utilisée agrandie : D/E et lignes 4-5 deviennent vides
    expect(specialKeys(s, { kind: "blanks" })).toContain("D1");
    expect(specialKeys(s, { kind: "blanks" })).not.toContain("F1");
  });

  it("formules : toutes les cellules dont le texte commence par =", () => {
    expect(specialKeys(sample(), { kind: "formulas" })).toEqual(["C1", "A2", "C2", "A3"]);
  });

  it("formules filtrées par type de résultat (nombre, texte, logique, erreur)", () => {
    const s = sample();
    expect(specialKeys(s, { kind: "formulas", types: ["number"] })).toEqual(["C1"]);
    expect(specialKeys(s, { kind: "formulas", types: ["text"] })).toEqual(["A3"]);
    expect(specialKeys(s, { kind: "formulas", types: ["logical"] })).toEqual(["C2"]);
    expect(specialKeys(s, { kind: "formulas", types: ["error"] })).toEqual(["A2"]);
    expect(specialKeys(s, { kind: "formulas", types: ["error", "number"] })).toEqual(["C1", "A2"]);
  });

  it("constantes : saisies non vides sans formule, filtrables par type", () => {
    const s = sample();
    expect(specialKeys(s, { kind: "constants" })).toEqual(["A1", "B1", "B2", "B3"]);
    // le moteur lit « TRUE » et « #N/A » saisis hors formule comme du texte (booléens et erreurs ne viennent que des formules)
    expect(specialKeys(s, { kind: "constants", types: ["text"] })).toEqual(["A1", "B2", "B3"]);
    expect(specialKeys(s, { kind: "constants", types: ["logical"] })).toEqual([]);
    expect(specialKeys(s, { kind: "constants", types: ["number"] })).toEqual(["B1"]);
  });

  it("cellules visibles seulement : les lignes masquées par filtre sont écartées", () => {
    expect(specialKeys(sample(), { kind: "formulas", visible: [0, 2] })).toEqual(["C1", "A3"]);
  });

  it("feuille vide : aucune cellule", () => {
    expect(specialKeys(createSheet(), { kind: "blanks" })).toEqual([]);
  });
});
