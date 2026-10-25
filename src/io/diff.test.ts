import { describe, it, expect } from "vitest";
import { diffCells, merge3, diffDocs } from "./diff";
import type { DktDoc } from "./types";

describe("diffCells", () => {
  it("ajout, suppression, modification", () => {
    const d = diffCells({ A1: "1", A2: "x", A3: "z" }, { A1: "2", A3: "z", B1: "n" });
    expect(d).toEqual([
      { key: "A1", kind: "mod", from: "1", to: "2" },
      { key: "A2", kind: "del", from: "x", to: "" },
      { key: "B1", kind: "add", from: "", to: "n" },
    ]);
  });
  it("identiques: aucun", () => expect(diffCells({ A1: "1" }, { A1: "1" })).toEqual([]));
});

describe("merge3", () => {
  const base = { A1: "1", A2: "2", A3: "3" };
  it("changements disjoints fusionnés", () => {
    const r = merge3(base, { ...base, A1: "x" }, { ...base, A2: "y", B1: "n" });
    expect(r.merged).toEqual({ A1: "x", A2: "y", A3: "3", B1: "n" });
    expect(r.conflicts).toEqual([]);
  });
  it("même changement des deux côtés: pas de conflit", () => {
    expect(merge3(base, { ...base, A1: "x" }, { ...base, A1: "x" }).conflicts).toEqual([]);
  });
  it("même cellule changée différemment: conflit (on garde nos valeurs)", () => {
    const r = merge3(base, { ...base, A1: "x" }, { ...base, A1: "y" });
    expect(r.conflicts).toEqual([{ key: "A1", base: "1", ours: "x", theirs: "y" }]);
    expect(r.merged.A1).toBe("x");
  });
  it("suppression d'un côté, modification de l'autre: conflit", () => {
    const { A1: _a, ...del } = base;
    expect(merge3(base, del, { ...base, A1: "y" }).conflicts).toHaveLength(1);
  });
  it("suppression propre appliquée", () => {
    const { A2: _a, ...del } = base;
    expect(merge3(base, base, del).merged).toEqual({ A1: "1", A3: "3" });
  });
});

describe("diffDocs", () => {
  const sh = (id: string, cells: Record<string, string>) => ({ id, name: id, cols: 26, rows: 100, cells: Object.fromEntries(Object.entries(cells).map(([k, raw]) => [k, { raw }])) });
  const doc = (...s: ReturnType<typeof sh>[]): DktDoc => ({ version: 1, sheets: s });
  it("par feuille, y compris ajoutée et supprimée", () => {
    const d = diffDocs(doc(sh("s1", { A1: "1" }), sh("s2", {})), doc(sh("s1", { A1: "2" }), sh("s3", { A1: "n" })));
    expect(d.find((x) => x.id === "s1")!.changes).toHaveLength(1);
    expect(d.find((x) => x.id === "s2")!.status).toBe("removed");
    expect(d.find((x) => x.id === "s3")!.status).toBe("added");
  });
  it("apparie par nom quand l'id est inconnu", () => {
    const d = diffDocs(doc(sh("s1", { A1: "1" })), doc({ ...sh("zz", { A1: "2" }), name: "s1" }));
    expect(d).toHaveLength(1);
    expect(d[0].status).toBe("changed");
  });
});
