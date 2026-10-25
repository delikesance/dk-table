import { describe, it, expect } from "vitest";
import { subtotals } from "./subtotals";

const SALES = [
  ["Nord", "Lille", "Pommes", "10"],
  ["Sud", "Nice", "Poires", "5"],
  ["Nord", "Lille", "Poires", "20"],
  ["Nord", "Amiens", "Pommes", "30"],
  ["Sud", "Nice", "Pommes", "15"],
];

/** Kinds of the rows, in order. */
const kinds = (rows: { kind: string }[]) => rows.map((r) => r.kind);

describe("subtotals — un niveau", () => {
  it("trie par groupe et insère un sous-total par changement de valeur", () => {
    const rows = subtotals(SALES, { groups: [0], values: [3], fn: "SUM" });
    expect(rows.map((r) => r.cells)).toEqual([
      ["Nord", "Lille", "Pommes", "10"],
      ["Nord", "Lille", "Poires", "20"],
      ["Nord", "Amiens", "Pommes", "30"],
      ["Total Nord", "", "", "60"],
      ["Sud", "Nice", "Poires", "5"],
      ["Sud", "Nice", "Pommes", "15"],
      ["Total Sud", "", "", "20"],
      ["Total général", "", "", "80"],
    ]);
    expect(kinds(rows)).toEqual(["data", "data", "data", "sub", "data", "data", "sub", "total"]);
  });

  it("le total général égale la somme de la colonne", () => {
    const rows = subtotals(SALES, { groups: [0], values: [3], fn: "SUM" });
    expect(rows[rows.length - 1]).toMatchObject({ kind: "total", cells: ["Total général", "", "", "80"] });
  });
});

describe("subtotals — trois niveaux", () => {
  it("produit un sous-total par niveau, du plus fin au plus large, puis le total", () => {
    const rows = subtotals(SALES, { groups: [0, 1, 2], values: [3], fn: "SUM" });
    const subs = rows
      .filter((r) => r.kind === "sub")
      .map((r) => [r.level, r.cells[[0, 1, 2][r.level!]], r.cells[3]]);
    expect(subs).toEqual([
      [2, "Total Pommes", "30"],
      [1, "Total Amiens", "30"],
      [2, "Total Poires", "20"],
      [2, "Total Pommes", "10"],
      [1, "Total Lille", "30"],
      [0, "Total Nord", "60"],
      [2, "Total Poires", "5"],
      [2, "Total Pommes", "15"],
      [1, "Total Nice", "20"],
      [0, "Total Sud", "20"],
    ]);
    expect(rows[rows.length - 1]).toMatchObject({ kind: "total", cells: ["Total général", "", "", "80"] });
  });
});

describe("subtotals — fonctions d'agrégation", () => {
  const DATA = [
    ["A", "2"],
    ["A", "4"],
    ["A", "x"],
    ["B", "7"],
  ];
  const sub = (fn: "SUM" | "COUNT" | "AVERAGE" | "MIN" | "MAX") =>
    subtotals(DATA, { groups: [0], values: [1], fn }).find((r) => r.cells[0] === "Total A")!.cells[1];

  it("SUM, COUNT, AVERAGE, MIN, MAX ignorent le texte", () => {
    expect(sub("SUM")).toBe("6");
    expect(sub("COUNT")).toBe("2");
    expect(sub("AVERAGE")).toBe("3");
    expect(sub("MIN")).toBe("2");
    expect(sub("MAX")).toBe("4");
  });

  it("une moyenne sans nombre reste vide, sans erreur", () => {
    const rows = subtotals([["A", "x"]], { groups: [0], values: [1], fn: "AVERAGE" });
    expect(rows[rows.length - 1].cells[1]).toBe("");
  });

  it("arrondit les flottants (0,1 + 0,2 = 0,3)", () => {
    const rows = subtotals([["A", "0,1"], ["A", "0.2"]], { groups: [0], values: [1], fn: "SUM" });
    expect(rows[rows.length - 1].cells[1]).toBe("0.3");
  });
});

describe("subtotals — cas limites", () => {
  it("plage vide : aucune ligne, aucune erreur", () => {
    expect(subtotals([], { groups: [0], values: [1], fn: "SUM" })).toEqual([]);
  });

  it("un seul groupe : un sous-total et le total général", () => {
    const rows = subtotals([["A", "1"], ["A", "2"]], { groups: [0], values: [1], fn: "SUM" });
    expect(kinds(rows)).toEqual(["data", "data", "sub", "total"]);
    expect(rows[2].cells[1]).toBe("3");
  });

  it("plusieurs colonnes de valeurs", () => {
    const rows = subtotals([["A", "1", "10"], ["B", "2", "20"]], { groups: [0], values: [1, 2], fn: "SUM" });
    expect(rows[rows.length - 1].cells).toEqual(["Total général", "3", "30"]);
  });
});
