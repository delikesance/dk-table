import { describe, expect, it } from "vitest";
import { dateColumns, dateRange, daysOfMonth, parseDate } from "./dateRange";

describe("parseDate", () => {
  it("lit AAAA-MM-JJ et JJ/MM/AAAA en ISO", () => {
    expect(parseDate("2026-03-05")).toBe("2026-03-05");
    expect(parseDate("5/3/2026")).toBe("2026-03-05");
    expect(parseDate(" 05/03/2026 ")).toBe("2026-03-05");
  });

  it("rejette les dates invalides et le texte", () => {
    expect(parseDate("2026-02-30")).toBeNull();
    expect(parseDate("31/04/2026")).toBeNull();
    expect(parseDate("bonjour")).toBeNull();
    expect(parseDate("")).toBeNull();
    expect(parseDate("12")).toBeNull();
  });
});

describe("dateColumns", () => {
  it("liste uniquement les colonnes à majorité de dates", () => {
    const table = [
      ["Nom", "Échéance", "Montant"],
      ["A", "2026-01-10", "12"],
      ["B", "2026-02-11", "30"],
      ["C", "", "7"],
      ["D", "15/03/2026", "x"],
    ];
    expect(dateColumns(table)).toEqual([1]);
  });

  it("ignore les colonnes sans aucune date ou vides", () => {
    expect(dateColumns([["A", "B"], ["x", ""], ["", ""]])).toEqual([]);
    expect(dateColumns([])).toEqual([]);
  });
});

describe("dateRange", () => {
  it("donne le min et le max ISO des valeurs", () => {
    expect(dateRange(["2026-03-01", "15/01/2026", "2026-02-10"])).toEqual({
      min: "2026-01-15",
      max: "2026-03-01",
    });
  });

  it("ignore les valeurs vides ou invalides sans erreur", () => {
    expect(dateRange(["", "abc", "2026-02-30", "2026-05-02", "  "])).toEqual({
      min: "2026-05-02",
      max: "2026-05-02",
    });
  });

  it("renvoie null sans aucune date valide", () => {
    expect(dateRange([])).toBeNull();
    expect(dateRange(["", "nope"])).toBeNull();
  });
});

describe("daysOfMonth", () => {
  it("génère tous les jours d'un mois donné", () => {
    const feb = daysOfMonth(2024, 2);
    expect(feb).toHaveLength(29);
    expect(feb[0]).toBe("2024-02-01");
    expect(feb[28]).toBe("2024-02-29");
    expect(daysOfMonth(2026, 4)).toHaveLength(30);
  });

  it("renvoie une liste vide pour un mois hors plage", () => {
    expect(daysOfMonth(2026, 0)).toEqual([]);
    expect(daysOfMonth(2026, 13)).toEqual([]);
  });
});
