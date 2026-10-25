/** Tests de la consolidation multi-feuilles (par position ou par étiquettes). */
import { describe, it, expect } from "vitest";
import { consolidate } from "./consolidate";

describe("consolidate : par position", () => {
  it("somme de plages de deux feuilles, cellule à cellule", () => {
    const a = [["1", "2"], ["3", "4"]];
    const b = [["10", "20"], ["30", "40"]];
    const out = consolidate([{ name: "A", grid: a }, { name: "B", grid: b }], { fn: "SUM" });
    expect(out).toEqual([["11", "22"], ["33", "44"]]);
  });

  it("moyenne, min, max, nb sur une même position", () => {
    const s1 = [["2"]];
    const s2 = [["6"]];
    const src = [{ name: "A", grid: s1 }, { name: "B", grid: s2 }];
    expect(consolidate(src, { fn: "AVERAGE" })).toEqual([["4"]]);
    expect(consolidate(src, { fn: "MIN" })).toEqual([["2"]]);
    expect(consolidate(src, { fn: "MAX" })).toEqual([["6"]]);
    expect(consolidate(src, { fn: "COUNT" })).toEqual([["2"]]);
  });

  it("ignore texte et vides sans erreur", () => {
    const a = [["abc", ""], ["4", "x"]];
    const b = [["8", ""], ["", "5"]];
    const out = consolidate([{ name: "A", grid: a }, { name: "B", grid: b }], { fn: "SUM" });
    expect(out).toEqual([["8", ""], ["4", "5"]]);
  });

  it("une cellule sans nombre donne une valeur vide", () => {
    const out = consolidate([{ name: "A", grid: [["abc"]] }], { fn: "SUM" });
    expect(out).toEqual([[""]]);
  });

  it("accepte la virgule décimale", () => {
    const out = consolidate(
      [{ name: "A", grid: [["1,5"]] }, { name: "B", grid: [["2"]] }],
      { fn: "SUM" },
    );
    expect(out).toEqual([["3.5"]]);
  });
});

describe("consolidate : par étiquettes", () => {
  const s1 = [
    ["", "Jan", "Fev"],
    ["Nord", "1", "2"],
    ["Sud", "3", "4"],
  ];
  const s2 = [
    ["", "Fev", "Mars"],
    ["Sud", "10", "20"],
    ["Ouest", "5", "6"],
  ];

  it("fusionne les étiquettes identiques et ajoute les nouvelles", () => {
    const out = consolidate(
      [{ name: "S1", grid: s1 }, { name: "S2", grid: s2 }],
      { fn: "SUM", topRow: true, leftCol: true },
    );
    expect(out).toEqual([
      ["", "Jan", "Fev", "Mars"],
      ["Nord", "1", "2", ""],
      ["Sud", "3", "14", "20"],
      ["Ouest", "", "5", "6"],
    ]);
  });

  it("l'agrégat s'applique par étiquette (moyenne)", () => {
    const out = consolidate(
      [{ name: "S1", grid: s1 }, { name: "S2", grid: s2 }],
      { fn: "AVERAGE", topRow: true, leftCol: true },
    );
    expect(out[2]).toEqual(["Sud", "3", "7", "20"]);
  });

  it("colonnes sans étiquette ignorées, espaces retirés", () => {
    const a = [[" X ", "", "Y"], ["1", "5", "2"]];
    const b = [["Y", "X"], ["10", "20"]];
    const out = consolidate(
      [{ name: "A", grid: a }, { name: "B", grid: b }],
      { fn: "SUM", topRow: true, leftCol: false },
    );
    expect(out).toEqual([["X", "Y"], ["21", "12"]]);
  });
});
