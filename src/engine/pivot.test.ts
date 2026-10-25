import { describe, it, expect } from "vitest";
import { pivot, defaultSpec } from "./pivot";

const T = [
  ["Region", "Produit", "Qte", "Prix"],
  ["Nord", "A", "2", "10"],
  ["Nord", "B", "1", "5"],
  ["Sud", "A", "3", "10"],
  ["Sud", "A", "1", "10"],
];

describe("pivot", () => {
  it("SUM sans colonnes", () => {
    expect(pivot(T, { row: "Region", value: "Qte", agg: "SUM" })).toEqual([
      ["Region", "SUM Qte"], ["Nord", "3"], ["Sud", "4"], ["Total", "7"],
    ]);
  });
  it("lignes x colonnes avec totaux", () => {
    expect(pivot(T, { row: "Region", col: "Produit", value: "Qte", agg: "SUM" })).toEqual([
      ["Region", "A", "B", "Total"], ["Nord", "2", "1", "3"], ["Sud", "4", "", "4"], ["Total", "6", "1", "7"],
    ]);
  });
  it("COUNT et AVG (total recalculé)", () => {
    expect(pivot(T, { row: "Region", value: "Qte", agg: "COUNT" }).slice(1)).toEqual([["Nord", "2"], ["Sud", "2"], ["Total", "4"]]);
    expect(pivot(T, { row: "Region", value: "Qte", agg: "AVG" }).slice(1)).toEqual([["Nord", "1.5"], ["Sud", "2"], ["Total", "1.75"]]);
  });
  it("champ calculé", () => {
    const r = pivot(T, { row: "Region", value: "CA", agg: "SUM", calc: { name: "CA", expr: "Qte*Prix" } });
    expect(r.slice(1)).toEqual([["Nord", "25"], ["Sud", "40"], ["Total", "65"]]);
  });
  it("expression invalide ou champ inconnu : tableau vide", () => {
    expect(pivot(T, { row: "X", value: "Qte", agg: "SUM" })).toEqual([]);
    expect(pivot(T, { row: "Region", value: "Z", agg: "SUM", calc: { name: "Z", expr: "Qte*" } })).toEqual([]);
  });
  it("defaultSpec: 1re colonne texte en lignes, 1re numérique en valeur", () => {
    expect(defaultSpec(T)).toEqual({ row: "Region", value: "Qte", agg: "SUM" });
  });
  it("defaultSpec: ignore l'identifiant unique et les colonnes id/numéro/année", () => {
    const t = [
      ["Ref", "Id", "Année", "Region", "Montant"],
      ["r1", "1", "2024", "Nord", "10"],
      ["r2", "2", "2024", "Sud", "5"],
      ["r3", "3", "2024", "Nord", "7"],
    ];
    expect(defaultSpec(t)).toEqual({ row: "Region", value: "Montant", agg: "SUM" });
  });
  it("defaultSpec: repli sur la 1re colonne texte si aucune ne se répète", () => {
    const t = [["Ref", "Qte"], ["a", "1"], ["b", "2"]];
    expect(defaultSpec(t)).toEqual({ row: "Ref", value: "Qte", agg: "SUM" });
  });
});
