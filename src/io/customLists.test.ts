import { describe, it, expect } from "vitest";
import { createCustomLists } from "./customLists";

/** Store en mémoire, même interface que localStorage. */
const memStore = (init: Record<string, string> = {}) => {
  const m = new Map(Object.entries(init));
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), raw: m };
};

describe("createCustomLists", () => {
  it("ajoute une liste valide et la mémorise", () => {
    const store = memStore();
    const cl = createCustomLists(store);
    expect(cl.add(["Bas", "Moyen", "Haut"]).ok).toBe(true);
    expect(cl.lists()).toEqual([["Bas", "Moyen", "Haut"]]);
    expect(JSON.parse(store.raw.get("dk-table.customLists")!)).toEqual([["Bas", "Moyen", "Haut"]]);
  });
  it("relit les listes depuis le store (persistance entre sessions)", () => {
    const store = memStore();
    createCustomLists(store).add(["Nord", "Sud", "Est"]);
    expect(createCustomLists(store).lists()).toEqual([["Nord", "Sud", "Est"]]);
  });
  it("refuse une liste vide ou en doublon sans rien écrire", () => {
    const store = memStore();
    const cl = createCustomLists(store);
    cl.add(["A", "B"]);
    expect(cl.add([]).ok).toBe(false);
    expect(cl.add(["A", "B"]).ok).toBe(false);
    expect(cl.lists()).toEqual([["A", "B"]]);
  });
  it("tolère un store corrompu", () => {
    expect(createCustomLists(memStore({ "dk-table.customLists": "{pas du json" })).lists()).toEqual([]);
  });
  it("fonctionne sans store (mémoire seule)", () => {
    const cl = createCustomLists(null);
    cl.add(["X", "Y"]);
    expect(cl.lists()).toEqual([["X", "Y"]]);
  });
});
