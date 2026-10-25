/** Tests des outils d'analyse (src/engine/analysis.ts) : plage, tableau de sortie, erreurs. */
import { describe, expect, it } from "vitest";
import { analysisInput, outputSheet, parseCell, runAnalysis } from "./analysis";

const GRID = [
  ["Mois", "Ventes", "Marge"],
  ["Jan", "10", "2"],
  ["Fev", "20", "4"],
  ["Mar", "30", "6"],
];

describe("parseCell", () => {
  it("lit les nombres (point ou virgule) et garde le texte", () => {
    expect(parseCell("12")).toBe(12);
    expect(parseCell("-3,5")).toBe(-3.5);
    expect(parseCell("1.25")).toBe(1.25);
    expect(parseCell("Jan")).toBe("Jan");
    expect(parseCell("")).toBe("");
  });
});

describe("analysisInput", () => {
  it("extrait la sous-plage demandée", () => {
    expect(analysisInput(GRID, "B2:C4")).toEqual({ ok: true, grid: [["10", "2"], ["20", "4"], ["30", "6"]] });
  });
  it("refuse une plage mal formée ou hors de la feuille", () => {
    expect(analysisInput(GRID, "pas une plage")).toEqual({ ok: false, message: "Plage invalide" });
    expect(analysisInput(GRID, "A1:A1:A1")).toEqual({ ok: false, message: "Plage invalide" });
  });
  it("refuse une plage vide", () => {
    expect(analysisInput(GRID, "E10:F12")).toEqual({ ok: false, message: "Plage vide" });
  });
});

describe("runAnalysis", () => {
  it("statistiques descriptives : une colonne par variable numérique, en-têtes", () => {
    const r = runAnalysis("descriptive", GRID, { headers: true });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.table[0]).toEqual(["Statistique", "Ventes", "Marge"]);
    expect(r.table[1]).toEqual(["Nombre", "3", "3"]);
    expect(r.table[2]).toEqual(["Somme", "60", "12"]);
    expect(r.table[3]).toEqual(["Moyenne", "20", "4"]);
  });

  it("corrélation : matrice carrée avec en-têtes, diagonale à 1", () => {
    const r = runAnalysis("correlation", GRID, { headers: true });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.table[0]).toEqual(["", "Ventes", "Marge"]);
    expect(r.table[1]).toEqual(["Ventes", "1", "1"]);
    expect(r.table[2]).toEqual(["Marge", "1", "1"]);
  });

  it("régression : pente, ordonnée, R² et nombre de paires (colonnes x et y)", () => {
    const r = runAnalysis("regression", GRID, { headers: true, x: 2, y: 3 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.table[0]).toEqual(["Indicateur", "Valeur"]);
    expect(r.table[1]).toEqual(["Pente", "0.2"]);
    expect(r.table[2]).toEqual(["Ordonnée à l'origine", "0"]);
    expect(r.table[4]).toEqual(["Paires", "3"]);
  });

  it("sans en-têtes, les colonnes reçoivent des noms génériques", () => {
    const r = runAnalysis("descriptive", [["1", "2"], ["3", "4"]], { headers: false });
    expect(r.ok && r.table[0]).toEqual(["Statistique", "Colonne 1", "Colonne 2"]);
  });

  it("erreurs : pas de colonne numérique, corrélation à une seule colonne, régression sans x/y", () => {
    expect(runAnalysis("descriptive", [["a"], ["b"]], { headers: false })).toEqual({
      ok: false, message: "Aucune colonne numérique",
    });
    expect(runAnalysis("correlation", [["1"], ["2"]], { headers: false })).toEqual({
      ok: false, message: "Il faut au moins deux colonnes numériques",
    });
    expect(runAnalysis("regression", GRID, { headers: true })).toEqual({
      ok: false, message: "Choisissez les colonnes X et Y",
    });
    expect(runAnalysis("regression", GRID, { headers: true, x: 1, y: 9 })).toEqual({
      ok: false, message: "Colonne X ou Y hors de la plage",
    });
  });
});

describe("outputSheet", () => {
  it("place le tableau en A1 avec des dimensions minimales", () => {
    const s = outputSheet([["a", "b"], ["1", ""]]);
    expect(s.cells).toEqual({ A1: { raw: "a" }, B1: { raw: "b" }, A2: { raw: "1" } });
    expect(s.cols).toBeGreaterThanOrEqual(26);
    expect(s.rows).toBeGreaterThanOrEqual(100);
  });
});
