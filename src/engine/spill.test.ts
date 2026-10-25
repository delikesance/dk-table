/** Tests du débordement (spill) : SPLIT, UNIQUE, FILTER, SORT, #SPILL!, recalcul et nettoyage. */
import { describe, expect, it } from "vitest";
import { createSheet, getDisplay, getValue, setCell } from "./sheet";

const fill = (s: ReturnType<typeof createSheet>, col: string, vals: (string | number)[]) =>
  vals.forEach((v, i) => setCell(s, `${col}${i + 1}`, String(v)));

describe("spill", () => {
  it("SPLIT déborde sur la ligne", () => {
    const s = createSheet();
    setCell(s, "A1", "a,b,c");
    setCell(s, "B1", '=SPLIT(A1;",")');
    expect([getDisplay(s, "B1"), getDisplay(s, "C1"), getDisplay(s, "D1")]).toEqual(["a", "b", "c"]);
  });
  it("UNIQUE déborde vers le bas, sans doublons", () => {
    const s = createSheet();
    fill(s, "A", ["x", "y", "x", "z"]);
    setCell(s, "C1", "=UNIQUE(A1:A4)");
    expect([1, 2, 3, 4].map((r) => getDisplay(s, `C${r}`))).toEqual(["x", "y", "z", ""]);
  });
  it("SORT trie (croissant, décroissant)", () => {
    const s = createSheet();
    fill(s, "A", [3, 1, 2]);
    setCell(s, "C1", "=SORT(A1:A3)");
    setCell(s, "D1", "=SORT(A1:A3;1;FALSE)");
    expect([1, 2, 3].map((r) => getValue(s, `C${r}`))).toEqual([1, 2, 3]);
    expect([1, 2, 3].map((r) => getValue(s, `D${r}`))).toEqual([3, 2, 1]);
  });
  it("FILTER avec condition sur plage", () => {
    const s = createSheet();
    fill(s, "A", [5, 1, 8, 2]);
    setCell(s, "C1", "=FILTER(A1:A4;A1:A4>2)");
    expect([1, 2, 3].map((r) => getValue(s, `C${r}`))).toEqual([5, 8, ""]);
  });
  it("FILTER sans résultat -> #N/A", () => {
    const s = createSheet();
    fill(s, "A", [1, 2]);
    setCell(s, "C1", "=FILTER(A1:A2;A1:A2>9)");
    expect(getDisplay(s, "C1")).toBe("#N/A");
  });
  it("cellule bloquante -> #SPILL!, libérée -> déborde", () => {
    const s = createSheet();
    setCell(s, "A1", "a,b,c");
    setCell(s, "C1", "bloc");
    setCell(s, "B1", '=SPLIT(A1;",")');
    expect(getDisplay(s, "B1")).toBe("#SPILL!");
    expect(getDisplay(s, "D1")).toBe("");
    setCell(s, "C1", "");
    expect(getDisplay(s, "B1")).toBe("a");
    expect(getDisplay(s, "D1")).toBe("c");
  });
  it("taper dans la zone débordée bloque l'origine", () => {
    const s = createSheet();
    setCell(s, "A1", "a,b");
    setCell(s, "B1", '=SPLIT(A1;",")');
    setCell(s, "C1", "x");
    expect(getDisplay(s, "B1")).toBe("#SPILL!");
    expect(getDisplay(s, "C1")).toBe("x");
  });
  it("recalcul : la zone suit la source et les dépendants", () => {
    const s = createSheet();
    setCell(s, "A1", "a,b,c");
    setCell(s, "B1", '=SPLIT(A1;",")');
    setCell(s, "B3", "=D1&C1");
    expect(getDisplay(s, "B3")).toBe("cb");
    setCell(s, "A1", "p,q");
    expect(getDisplay(s, "D1")).toBe("");
    expect(getDisplay(s, "B3")).toBe("q");
  });
  it("effacer l'origine vide la zone", () => {
    const s = createSheet();
    setCell(s, "A1", "a,b");
    setCell(s, "B1", '=SPLIT(A1;",")');
    setCell(s, "B1", "");
    expect(getDisplay(s, "C1")).toBe("");
  });
  it("dans une expression : première valeur", () => {
    const s = createSheet();
    fill(s, "A", [3, 1]);
    setCell(s, "C1", "=SORT(A1:A2)&\"!\"");
    expect(getDisplay(s, "C1")).toBe("1!");
  });
});
