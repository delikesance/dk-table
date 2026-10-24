// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { fillPlan } from "./fill";
import { createGrid } from "./grid";

const raw: Record<string, string> = { A1: "1", B1: "x", A2: "=A1+1", A5: "z" };
const get = (k: string) => raw[k] ?? "";

describe("fillPlan", () => {
  it("bas: la première ligne de la plage est recopiée sur les suivantes", () => {
    expect(fillPlan({ col: 0, row: 0 }, { col: 1, row: 2 }, "down", get))
      .toEqual({ A2: "1", A3: "1", B2: "x", B3: "x" });
  });
  it("bas: ligne unique -> recopie la cellule du dessus", () => {
    expect(fillPlan({ col: 0, row: 1 }, { col: 0, row: 1 }, "down", get)).toEqual({ A2: "1" });
  });
  it("bas: ligne unique en haut -> rien", () => {
    expect(fillPlan({ col: 0, row: 0 }, { col: 0, row: 0 }, "down", get)).toEqual({});
  });
  it("droite: la première colonne est recopiée; formules telles quelles", () => {
    expect(fillPlan({ col: 0, row: 1 }, { col: 2, row: 1 }, "right", get)).toEqual({ B2: "=A1+1", C2: "=A1+1" });
  });
  it("droite: cellule unique -> recopie celle de gauche", () => {
    expect(fillPlan({ col: 1, row: 0 }, { col: 1, row: 0 }, "right", get)).toEqual({ B1: "1" });
  });
  it("ignore les lignes masquées", () => {
    expect(fillPlan({ col: 0, row: 0 }, { col: 0, row: 2 }, "down", get, (r) => r === 1)).toEqual({ A3: "1" });
  });
});

describe("Ctrl+D / Ctrl+R dans la grille", () => {
  let host: HTMLElement;
  let onEdit: Mock<(key: string, raw: string) => void>;
  const key = (k: string, init: KeyboardEventInit = {}) =>
    (host.querySelector(".dkg") as HTMLElement).dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true, ...init }));
  beforeEach(() => {
    host = document.createElement("div");
    document.body.replaceChildren(host);
    onEdit = vi.fn();
  });
  it("Ctrl+D recopie vers le bas la plage sélectionnée", () => {
    const g = createGrid(host, { cols: 3, rows: 10, getDisplay: get, getRaw: get, onEdit });
    g.select("A1:B3");
    const ev = new KeyboardEvent("keydown", { key: "d", ctrlKey: true, bubbles: true, cancelable: true });
    (host.querySelector(".dkg") as HTMLElement).dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
    expect(onEdit.mock.calls).toEqual([["A2", "1"], ["B2", "x"], ["A3", "1"], ["B3", "x"]]);
  });
  it("Ctrl+R recopie vers la droite", () => {
    const g = createGrid(host, { cols: 3, rows: 10, getDisplay: get, getRaw: get, onEdit });
    g.select("A1:C1");
    key("r", { ctrlKey: true });
    expect(onEdit.mock.calls).toEqual([["B1", "1"], ["C1", "1"]]);
  });
  it("sans Ctrl, 'd' ouvre l'éditeur et ne recopie pas", () => {
    createGrid(host, { cols: 3, rows: 10, getDisplay: get, getRaw: get, onEdit });
    key("d");
    expect(onEdit).not.toHaveBeenCalled();
  });
});
