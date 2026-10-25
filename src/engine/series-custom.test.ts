import { describe, it, expect } from "vitest";
import { extendSeries } from "./series";

const LISTS = [["Bas", "Moyen", "Haut"]];

describe("extendSeries: listes personnalisées", () => {
  it("prolonge une liste de façon cyclique (Bas, Moyen -> Haut, Bas, Moyen)", () => {
    expect(extendSeries(["Bas", "Moyen"], 3, false, 1, LISTS)).toEqual(["Haut", "Bas", "Moyen"]);
  });
  it("une seule valeur: suite dans l'ordre de la liste", () => {
    expect(extendSeries(["Haut"], 2, false, 1, LISTS)).toEqual(["Bas", "Moyen"]);
  });
  it("recopie vers le haut (dir -1)", () => {
    expect(extendSeries(["Moyen"], 1, false, -1, LISTS)).toEqual(["Bas"]);
  });
  it("insensible à la casse", () => {
    expect(extendSeries(["BAS"], 1, false, 1, LISTS)).toEqual(["MOYEN"]);
  });
  it("sans liste fournie: texte recopié comme avant", () => {
    expect(extendSeries(["Bas"], 2)).toEqual(["Bas", "Bas"]);
  });
});
