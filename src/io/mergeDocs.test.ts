/** Fusion à 3 voies de classeurs, feuille par feuille (`mergeDocs`). */
import { describe, expect, it } from "vitest";
import { mergeDocs } from "./mergeDocs";
import type { DktDoc } from "./types";

const doc = (cells: Record<string, string>, id = "s1", name = "Feuille 1"): DktDoc => ({
  version: 1,
  sheets: [{ id, name, cols: 26, rows: 100, cells: Object.fromEntries(Object.entries(cells).map(([k, raw]) => [k, { raw }])) }],
});

describe("mergeDocs", () => {
  it("fusionne les changements disjoints sans conflit", () => {
    const [m] = mergeDocs(doc({ A1: "1" }), doc({ A1: "1", B1: "o" }), doc({ A1: "2" }));
    expect(m.conflicts).toEqual([]);
    expect(m.merged).toEqual({ A1: "2", B1: "o" });
    expect(m.name).toBe("Feuille 1");
  });
  it("liste les conflits et garde nos valeurs", () => {
    const [m] = mergeDocs(doc({ A1: "1" }), doc({ A1: "2" }), doc({ A1: "3" }));
    expect(m.conflicts).toEqual([{ key: "A1", base: "1", ours: "2", theirs: "3" }]);
    expect(m.merged.A1).toBe("2");
  });
  it("apparie par nom si les ids diffèrent", () => {
    const [m] = mergeDocs(doc({ A1: "1" }, "x"), doc({ A1: "1" }, "y"), doc({ A1: "9" }, "z"));
    expect(m.merged.A1).toBe("9");
  });
  it("feuille absente d'un côté = vide", () => {
    const [m] = mergeDocs(doc({}, "b", "Autre"), doc({ A1: "1" }), doc({}, "t", "Autre"));
    expect(m.merged).toEqual({ A1: "1" });
  });
});
