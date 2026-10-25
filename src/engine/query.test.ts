import { describe, it, expect } from "vitest";
import { runQuery, type Step } from "./query";
import { queryToLua } from "./queryLua";

const T = [["Region", "Produit", "Qte"], ["Nord", "A", "2"], ["Nord", "A", "2"], ["Sud", "B", "5"], ["Sud", "A", "1"]];

describe("runQuery", () => {
  it("filtre (égal, supérieur)", () => {
    expect(runQuery(T, [{ kind: "filter", col: "Region", op: "=", value: "Sud" }])).toEqual([T[0], T[3], T[4]]);
    expect(runQuery(T, [{ kind: "filter", col: "Qte", op: ">", value: "1" }]).length).toBe(4);
  });
  it("dédoublonne", () => {
    expect(runQuery(T, [{ kind: "dedupe" }]).length).toBe(4);
    expect(runQuery(T, [{ kind: "dedupe", cols: ["Region"] }]).length).toBe(3);
  });
  it("scinde une colonne", () => {
    const t = [["Nom"], ["a-b"], ["c-d"]];
    expect(runQuery(t, [{ kind: "split", col: "Nom", delim: "-" }])).toEqual([["Nom 1", "Nom 2"], ["a", "b"], ["c", "d"]]);
  });
  it("pivote", () => {
    const out = runQuery(T, [{ kind: "pivot", spec: { row: "Region", value: "Qte", agg: "SUM" } }]);
    expect(out[1]).toEqual(["Nord", "4"]);
  });
  it("enchaîne et rejoue sur une source modifiée", () => {
    const steps: Step[] = [{ kind: "dedupe" }, { kind: "filter", col: "Region", op: "=", value: "Nord" }];
    expect(runQuery(T, steps).length).toBe(2);
    expect(runQuery([...T, ["Nord", "C", "9"]], steps).length).toBe(3);
  });
  it("colonne inconnue : tableau vide", () => {
    expect(runQuery(T, [{ kind: "filter", col: "X", op: "=", value: "1" }])).toEqual([]);
  });
});

describe("queryToLua", () => {
  it("produit un script Lua par étape", () => {
    const lua = queryToLua([{ kind: "filter", col: "Region", op: "=", value: "Sud" }, { kind: "dedupe" }], "A1:C5");
    expect(lua).toContain("A1:C5");
    expect(lua).toContain("Sud");
    expect(lua).toContain("-- 2.");
  });
});

import { createSheet, setCell, getRaw } from "./sheet";
import { tableOf, replayInto } from "./query";

describe("rejeu automatique", () => {
  const steps: Step[] = [{ kind: "filter", col: "Region", op: "=", value: "Sud" }];
  it("tableOf lit la zone utilisée", () => {
    const s = createSheet();
    T.forEach((r, i) => r.forEach((v, j) => setCell(s, `${"ABC"[j]}${i + 1}`, v)));
    expect(tableOf(s.cells)).toEqual(T);
  });
  it("replayInto remplace le contenu et suit la source", () => {
    const src = createSheet(), dst = createSheet();
    T.forEach((r, i) => r.forEach((v, j) => setCell(src, `${"ABC"[j]}${i + 1}`, v)));
    setCell(dst, "Z9", "vieux");
    replayInto(dst, tableOf(src.cells), steps);
    expect(getRaw(dst, "Z9")).toBe("");
    expect(getRaw(dst, "A3")).toBe("Sud");
    expect(getRaw(dst, "A4")).toBe("");
    setCell(src, "A2", "Sud");
    replayInto(dst, tableOf(src.cells), steps);
    expect(getRaw(dst, "A4")).toBe("Sud");
  });
});
