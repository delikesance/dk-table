import { describe, expect, it } from "vitest";
import { createSheet, setCell } from "../engine/sheet";
import { resolveRef, searchRefs, type RefBook } from "./refs";

/** Synthese-like sheet: header row, one row per person, a computed column. */
function book(): RefBook {
  const s = createSheet();
  const rows = [["Commercial", "CA_T1", "Objectif_T1"], ["Alice", "39500", "40000"], ["Bob", "40000", "35000"]];
  rows.forEach((r, i) => r.forEach((v, j) => setCell(s, "ABC"[j] + (i + 1), v)));
  setCell(s, "D1", "Atteinte");
  setCell(s, "D2", "=B2/C2");
  setCell(s, "D3", "=B3/C3");
  const t = createSheet();
  setCell(t, "A1", "T002");
  setCell(t, "B1", "Bob");
  const list: ReturnType<RefBook["sheets"]> = [
    { id: "s1", name: "Synthese", sheet: s, styles: { B2: { format: "currency" }, D3: { format: "percent" } } },
    { id: "s2", name: "Transactions", sheet: t, styles: {} },
  ];
  return { sheets: () => list };
}

describe("resolveRef", () => {
  it("lit la valeur affichée d'une cellule avec son format", () => {
    expect(resolveRef(book(), { sheet: "s1", ref: "C3" }).text).toBe("35000");
    expect(resolveRef(book(), { sheet: "s1", ref: "B2" }).text).toMatch(/39\s?500/);
    expect(resolveRef(book(), { sheet: "s1", ref: "D3" }).text).toMatch(/114/);
  });
  it("suit le calcul : la valeur change avec la cellule", () => {
    const b = book();
    setCell(b.sheets()[0].sheet, "B3", "70000");
    expect(resolveRef(b, { sheet: "s1", ref: "D3" }).text).toMatch(/200/);
  });
  it("renvoie #REF! pour une feuille inconnue", () => {
    const r = resolveRef(book(), { sheet: "zz", ref: "A1" });
    expect(r.text).toBe("#REF!");
    expect(r.error).toBe(true);
  });
  it("donne l'adresse complète et le nom de la feuille", () => {
    expect(resolveRef(book(), { sheet: "s1", ref: "B3" }).address).toBe("Synthese!B3");
  });
  it("résume une plage par ses dimensions", () => {
    const r = resolveRef(book(), { sheet: "s1", ref: "A2:D3" });
    expect(r.text).toBe("Synthese!A2:D3 · 2 × 4");
    expect(r.error).toBeFalsy();
  });
  it("suit le renommage de la feuille (référence par id)", () => {
    const b = book();
    b.sheets()[0].name = "Bilan";
    expect(resolveRef(b, { sheet: "s1", ref: "B3" }).address).toBe("Bilan!B3");
  });
});

describe("searchRefs", () => {
  it("trouve une case par les noms de ligne et de colonne", () => {
    const hits = searchRefs(book(), "bob ca");
    expect(hits[0]).toMatchObject({ label: "Bob · CA_T1", address: "Synthese!B3", target: { sheet: "s1", ref: "B3" } });
    expect(hits[0].text).toBe("40000");
  });
  it("trouve par adresse et par nom de feuille", () => {
    expect(searchRefs(book(), "synthese!b3")[0].target).toEqual({ sheet: "s1", ref: "B3" });
    expect(searchRefs(book(), "syn").every((h) => h.address.startsWith("Synthese"))).toBe(true);
  });
  it("ne propose rien pour une requête vide ou sans correspondance", () => {
    expect(searchRefs(book(), "")).toEqual([]);
    expect(searchRefs(book(), "zzzz")).toEqual([]);
  });
  it("limite le nombre de résultats", () => {
    expect(searchRefs(book(), "s", 3).length).toBeLessThanOrEqual(3);
  });
});
