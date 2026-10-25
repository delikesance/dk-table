import { describe, it, expect } from "vitest";
import { seriesPlan, autoFillEnd } from "./seriesFill";

const mk = (o: Record<string, string>) => (k: string) => o[k] ?? "";
const P = (col: number, row: number) => ({ col, row });

describe("seriesPlan", () => {
  it("bas: A1:A3 = 1,2,3 glissé jusqu'à A6", () => {
    const r = seriesPlan(P(0, 0), P(0, 2), P(0, 5), mk({ A1: "1", A2: "2", A3: "3" }), false);
    expect(r.plan).toEqual({ A4: "4", A5: "5", A6: "6" });
    expect(r.sel).toEqual({ anchor: P(0, 0), active: P(0, 5) });
  });
  it("droite: ligne 1, plusieurs colonnes indépendantes", () => {
    const r = seriesPlan(P(0, 0), P(0, 1), P(2, 1), mk({ A1: "Item 1", A2: "10" }), false);
    expect(r.plan).toEqual({ B1: "Item 2", C1: "Item 3", B2: "10", C2: "10" });
  });
  it("haut: la série continue à rebours; sélection de la cible à la source", () => {
    const r = seriesPlan(P(0, 3), P(0, 4), P(0, 1), mk({ A4: "1", A5: "2" }), false);
    expect(r.plan).toEqual({ A3: "0", A2: "-1" });
    expect(r.sel).toEqual({ anchor: P(0, 4), active: P(0, 1) });
  });
  it("gauche", () => {
    const r = seriesPlan(P(2, 0), P(3, 0), P(0, 0), mk({ C1: "10", D1: "20" }), false);
    expect(r.plan).toEqual({ B1: "0", A1: "-10" });
  });
  it("formules: décalage des références, motif cyclique, pas de série", () => {
    const r = seriesPlan(P(1, 0), P(1, 0), P(1, 3), mk({ A1: "1", B1: "=A1*2" }), false);
    expect(r.plan).toEqual({ B2: "=A2*2", B3: "=A3*2", B4: "=A4*2" });
  });
  it("Ctrl inverse: un nombre seul devient série", () => {
    const r = seriesPlan(P(0, 0), P(0, 0), P(0, 2), mk({ A1: "5" }), true);
    expect(r.plan).toEqual({ A2: "6", A3: "7" });
  });
  it("l'axe dominant gagne (diagonale)", () => {
    const r = seriesPlan(P(0, 0), P(0, 0), P(1, 3), mk({ A1: "1" }), false);
    expect(Object.keys(r.plan)).toEqual(["A2", "A3", "A4"]);
  });
  it("cible dans la plage ou sur la plage: rien", () => {
    expect(seriesPlan(P(0, 0), P(0, 2), P(0, 1), mk({}), false).plan).toEqual({});
  });
  it("rognée aux limites de la feuille", () => {
    const r = seriesPlan(P(0, 0), P(0, 0), P(0, -3), mk({ A1: "1" }), false, { cols: 5, rows: 10 });
    expect(r.plan).toEqual({});
  });
});

describe("autoFillEnd (double-clic sur la poignée)", () => {
  const g = mk({ A1: "x", A2: "x", A3: "x", A4: "x", B1: "1", B2: "2" });
  it("descend jusqu'à la fin des données de la colonne de gauche", () => {
    expect(autoFillEnd(P(1, 0), P(1, 1), g, 100, 10)).toBe(3);
  });
  it("sinon regarde la colonne de droite", () => {
    expect(autoFillEnd(P(0, 0), P(0, 0), mk({ A1: "1", B1: "x", B2: "x" }), 10, 10)).toBe(1);
  });
  it("rien à côté -> null", () => {
    expect(autoFillEnd(P(0, 0), P(0, 0), mk({ A1: "1" }), 10, 10)).toBeNull();
  });
  it("plafonné aux lignes de la feuille", () => {
    expect(autoFillEnd(P(1, 0), P(1, 0), (k) => (k.startsWith("A") ? "x" : ""), 5, 10)).toBe(4);
  });
});

describe("seriesPlan: formules vers le haut", () => {
  it("décalage des références vers le haut", () => {
    const r = seriesPlan(P(1, 4), P(1, 4), P(1, 2), mk({ B5: "=A5*2" }), false);
    expect(r.plan).toEqual({ B4: "=A4*2", B3: "=A3*2" });
  });
});
