import { describe, expect, it } from "vitest";
import { createSheet, setCell } from "../engine/sheet";
import { chartData, readRange, tableView, usedRange, type BlockAttrs } from "./blocks";
import type { RefBook } from "./refs";

function book(): RefBook {
  const s = createSheet();
  const rows = [["Commercial", "CA_T1", "Objectif", "Atteinte"], ["Alice", "39500", "40000", "0.9875"], ["Bob", "40000", "35000", "1.1429"], ["Claire", "55000", "50000", "1.1"]];
  rows.forEach((r, i) => r.forEach((v, j) => setCell(s, "ABCD"[j] + (i + 1), v)));
  return { sheets: () => [{ id: "s1", name: "Synthese", sheet: s, styles: { D2: { format: "percent" }, D3: { format: "percent" }, D4: { format: "percent" } } }] };
}
const attrs = (o: Partial<BlockAttrs> = {}): BlockAttrs => ({ sheet: "s1", ref: "A1:D4", kind: "table", header: true, cols: null, value: null, ...o });

describe("readRange", () => {
  it("lit le texte affiché ligne par ligne, avec les formats", () => {
    const d = readRange(book(), attrs({ ref: "A3:D4" }))!;
    expect(d.rows).toHaveLength(2);
    expect(d.rows[0][0]).toBe("Bob");
    expect(d.rows[0][3]).toMatch(/114/);
    expect(d.nums[0][1]).toBe(40000);
  });
  it("renvoie null quand la feuille n'existe plus", () => {
    expect(readRange(book(), attrs({ sheet: "zz" }))).toBeNull();
  });
});

describe("tableView", () => {
  it("sépare l'en-tête quand header est vrai, sinon tout est corps", () => {
    const d = readRange(book(), attrs())!;
    const t = tableView(d, attrs());
    expect(t.head).toEqual(["Commercial", "CA_T1", "Objectif", "Atteinte"]);
    expect(t.body).toHaveLength(3);
    expect(tableView(d, attrs({ header: false })).head).toBeNull();
    expect(tableView(d, attrs({ header: false })).body).toHaveLength(4);
  });
  it("ne garde que les colonnes choisies, dans l'ordre", () => {
    const t = tableView(readRange(book(), attrs())!, attrs({ cols: [0, 3] }));
    expect(t.head).toEqual(["Commercial", "Atteinte"]);
    expect(t.body[0]).toHaveLength(2);
  });
});

describe("chartData", () => {
  it("prend la 1re colonne comme étiquettes et la dernière comme valeurs par défaut", () => {
    const c = chartData(readRange(book(), attrs())!, attrs({ kind: "bar" }));
    expect(c.labels).toEqual(["Alice", "Bob", "Claire"]);
    expect(c.values).toEqual([0.9875, 1.1429, 1.1]);
    expect(c.valueName).toBe("Atteinte");
  });
  it("utilise la colonne de valeurs choisie", () => {
    const c = chartData(readRange(book(), attrs())!, attrs({ kind: "bar", value: 1 }));
    expect(c.values).toEqual([39500, 40000, 55000]);
    expect(c.valueName).toBe("CA_T1");
  });
});

describe("usedRange", () => {
  it("couvre toutes les cellules remplies depuis A1", () => {
    expect(usedRange(book().sheets()[0].sheet)).toBe("A1:D4");
  });
});
