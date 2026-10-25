/** Tests de dataTable.ts : tables de données à 1 et 2 variables (substitution, restauration, erreurs). */
import { afterEach, describe, expect, it } from "vitest";
import { setCalcMode } from "./calc-mode";
import { createSheet, getRaw, getValue, setCell } from "./sheet";
import { dataTable1, dataTable2 } from "./dataTable";

/** Feuille: C1 = x, C2 = y, D1 = "=C1*10+1" (1 variable), C3 = "=C1*10+C2" (2 variables). */
function sheet() {
  const s = createSheet();
  setCell(s, "C1", "5");
  setCell(s, "C2", "7");
  setCell(s, "D1", "=C1*10+1");
  setCell(s, "C3", "=C1*10+C2");
  return s;
}

describe("dataTable1: table à 1 variable", () => {
  it("calcule la formule pour chaque valeur d'entrée", () => {
    const s = sheet();
    const r = dataTable1(s, { formula: "D1", input: "C1", values: ["1", "2", "3"] });
    expect(r).toEqual({ ok: true, results: [11, 21, 31] });
  });

  it("n'modifie pas la cellule d'entrée après calcul", () => {
    const s = sheet();
    dataTable1(s, { formula: "D1", input: "C1", values: ["1", "2"] });
    expect(getRaw(s, "C1")).toBe("5");
    expect(getValue(s, "D1")).toBe(51);
  });

  it("renvoie une liste vide pour une liste de valeurs vide", () => {
    const s = sheet();
    expect(dataTable1(s, { formula: "D1", input: "C1", values: [] })).toEqual({ ok: true, results: [] });
  });

  it("refuse une référence d'entrée invalide", () => {
    const s = sheet();
    const r = dataTable1(s, { formula: "D1", input: "!!", values: ["1"] });
    expect(r).toMatchObject({ ok: false, reason: "bad-input" });
  });

  it("refuse une référence d'entrée hors feuille", () => {
    const s = sheet();
    const r = dataTable1(s, { formula: "D1", input: "Z999", values: ["1"] });
    expect(r).toMatchObject({ ok: false, reason: "bad-input" });
  });

  it("refuse une entrée qui dépend de la cellule résultat (circulaire)", () => {
    const s = sheet();
    setCell(s, "C1", "=D1+1");
    const r = dataTable1(s, { formula: "D1", input: "C1", values: ["1"] });
    expect(r).toMatchObject({ ok: false, reason: "input-circular" });
    expect(getRaw(s, "C1")).toBe("=D1+1");
  });

  it("refuse une cellule résultat qui n'est pas une formule", () => {
    const s = sheet();
    const r = dataTable1(s, { formula: "C2", input: "C1", values: ["1"] });
    expect(r).toMatchObject({ ok: false, reason: "not-formula" });
  });
});

describe("dataTable2: table à 2 variables", () => {
  it("calcule chaque intersection (ligne = colonne d'entrée, colonne = ligne d'entrée)", () => {
    const s = sheet();
    const r = dataTable2(s, {
      formula: "C3",
      rowInput: "C1",
      colInput: "C2",
      rowValues: ["1", "2"],
      colValues: ["3", "4"],
    });
    expect(r).toEqual({ ok: true, results: [[13, 23], [14, 24]] });
  });

  it("restaure les deux cellules d'entrée", () => {
    const s = sheet();
    dataTable2(s, { formula: "C3", rowInput: "C1", colInput: "C2", rowValues: ["1"], colValues: ["3"] });
    expect(getRaw(s, "C1")).toBe("5");
    expect(getRaw(s, "C2")).toBe("7");
    expect(getValue(s, "C3")).toBe(57);
  });

  it("refuse deux entrées identiques", () => {
    const s = sheet();
    const r = dataTable2(s, { formula: "C3", rowInput: "C1", colInput: "C1", rowValues: ["1"], colValues: ["1"] });
    expect(r).toMatchObject({ ok: false, reason: "bad-input" });
  });

  it("refuse une entrée invalide et garde les saisies", () => {
    const s = sheet();
    const r = dataTable2(s, { formula: "C3", rowInput: "C1", colInput: "!!", rowValues: ["1"], colValues: ["1"] });
    expect(r).toMatchObject({ ok: false, reason: "bad-input" });
    expect(getRaw(s, "C1")).toBe("5");
  });

  it("refuse une cellule résultat qui n'est pas une formule", () => {
    const s = sheet();
    const r = dataTable2(s, { formula: "C2", rowInput: "C1", colInput: "C2", rowValues: ["1"], colValues: ["1"] });
    expect(r).toMatchObject({ ok: false, reason: "not-formula" });
  });
});

describe("dataTable: mode de calcul manuel", () => {
  afterEach(() => setCalcMode({ manual: false }));

  it("recalcule la formule résultat à chaque valeur, et la remet à sa valeur d'origine", () => {
    const s = sheet();
    setCalcMode({ manual: true });
    const r = dataTable1(s, { formula: "D1", input: "C1", values: ["1", "2", "3"] });
    expect(r).toEqual({ ok: true, results: [11, 21, 31] });
    expect(getRaw(s, "C1")).toBe("5");
    expect(getValue(s, "D1")).toBe(51);
  });
});
