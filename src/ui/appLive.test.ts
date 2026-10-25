// @vitest-environment jsdom
/** Requêtes vivantes : persistance, rejeu, gardes. */
import { describe, it, expect, beforeEach } from "vitest";
import { createSheet, setCell, getRaw } from "../engine/sheet";
import { liveQueries, saveLive, runLive } from "./appLive";
import type { Ctx } from "./appState";

const KEY = "dk-table.livequery";
const steps = [{ kind: "filter" as const, col: "R", op: "=" as const, value: "S" }];

/** Contexte minimal: deux feuilles nommées, `cur` = résultat, grille factice comptant les refresh. */
function ctx(names: [string, string] = ["Src", "Dst"]) {
  const src = { name: names[0], sheet: createSheet() }, dst = { name: names[1], sheet: createSheet() };
  setCell(src.sheet, "A1", "R"); setCell(src.sheet, "A2", "S"); setCell(src.sheet, "A3", "N");
  const c = { entries: [src, dst], cur: dst, grid: { refresh: () => { c.refreshed++; } }, refreshed: 0 } as unknown as Ctx & { refreshed: number };
  return { c, src, dst };
}

beforeEach(() => localStorage.clear());

describe("appLive", () => {
  it("JSON corrompu : liste vide", () => {
    localStorage.setItem(KEY, "{pas du json");
    expect(liveQueries()).toEqual([]);
  });
  it("saveLive remplace la requête de même feuille résultat", () => {
    saveLive({ src: "Src", dst: "Dst", steps });
    saveLive({ src: "Autre", dst: "Dst", steps });
    expect(liveQueries().map((q) => q.src)).toEqual(["Autre"]);
  });
  it("feuille source absente : rien n'est écrit", () => {
    const { c, dst } = ctx();
    saveLive({ src: "Inconnue", dst: "Dst", steps });
    runLive(c);
    expect(getRaw(dst.sheet, "A1")).toBe("");
  });
  it("source = résultat : ignoré", () => {
    const { c, src } = ctx();
    saveLive({ src: "Src", dst: "Src", steps });
    runLive(c);
    expect(getRaw(src.sheet, "A3")).toBe("N");
  });
  it("recalcule après modification de la source et rafraîchit la grille visible", () => {
    const { c, src, dst } = ctx();
    saveLive({ src: "Src", dst: "Dst", steps });
    runLive(c);
    expect(getRaw(dst.sheet, "A2")).toBe("S");
    expect(getRaw(dst.sheet, "A3")).toBe("");
    setCell(src.sheet, "A3", "S");
    runLive(c);
    expect(getRaw(dst.sheet, "A3")).toBe("S");
    expect(c.refreshed).toBe(2);
  });
  it("garde busy : un rejeu déclenché pendant le rejeu est ignoré", () => {
    const { c, dst } = ctx();
    saveLive({ src: "Src", dst: "Dst", steps });
    (c as unknown as { grid: { refresh(): void } }).grid.refresh = () => { c.refreshed++; runLive(c); };
    runLive(c);
    expect(c.refreshed).toBe(1);
    expect(getRaw(dst.sheet, "A2")).toBe("S");
  });
});
