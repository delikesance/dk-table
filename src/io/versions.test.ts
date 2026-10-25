import { describe, it, expect } from "vitest";
import { createVersion, listVersions, VersionError } from "./versions";
import { emptyHistory } from "./history";
import { parse, serialize } from "./format";
import type { DktDoc } from "./types";

const doc = (cells: Record<string, string>): DktDoc => ({
  version: 1,
  sheets: [{ id: "s1", name: "A", cols: 26, rows: 100, cells: Object.fromEntries(Object.entries(cells).map(([k, raw]) => [k, { raw }])) }],
});

describe("versions nommées", () => {
  it("crée un instantané complet avec nom et horodatage", () => {
    const h = createVersion(emptyHistory(), doc({ A1: "1", B2: "=A1*2" }), "Clôture", 500);
    expect(h.snaps).toHaveLength(1);
    expect(h.snaps[0]).toMatchObject({ name: "Clôture", t: 500, sheets: [{ id: "s1", name: "A", cells: { A1: "1", B2: "=A1*2" } }] });
  });

  it("liste les versions de la plus récente à la plus ancienne", () => {
    let h = createVersion(emptyHistory(), doc({}), "Janvier", 100);
    h = createVersion(h, doc({}), "Mars", 300);
    h = createVersion(h, doc({}), "Février", 200);
    expect(listVersions(h).map((s) => s.name)).toEqual(["Mars", "Février", "Janvier"]);
    expect(h.snaps.map((s) => s.name)).toEqual(["Janvier", "Mars", "Février"]);
  });

  it("refuse un nom vide ou blanc", () => {
    expect(() => createVersion(emptyHistory(), doc({}), "", 1)).toThrow(VersionError);
    expect(() => createVersion(emptyHistory(), doc({}), "   ", 1)).toThrow(VersionError);
  });

  it("refuse un nom en doublon et garde le nom sans espaces de bord", () => {
    const h = createVersion(emptyHistory(), doc({}), "  V1 ", 1);
    expect(h.snaps[0].name).toBe("V1");
    expect(() => createVersion(h, doc({}), "V1", 2)).toThrow(VersionError);
  });

  it("persiste dans le fichier : les versions survivent à un aller-retour", () => {
    const h = createVersion(emptyHistory(), doc({ A1: "7" }), "Avant revue", 42);
    const back = parse(serialize({ ...doc({}), history: h }));
    expect(listVersions(back.history!)).toEqual(listVersions(h));
  });
});
