/** Tests du moteur des scénarios : limite de 32 cellules, unicité des noms, capture et application. */
import { describe, expect, it } from "vitest";
import { createSheet, getRaw, getValue, setCell } from "./sheet";
import {
  MAX_SCENARIO_CELLS,
  addScenario,
  applyScenario,
  captureCells,
  removeScenario,
  selectionCells,
} from "./scenario";

const cell = (key: string, raw: string) => ({ sheet: "s1", key, raw });

describe("addScenario", () => {
  it("enregistre un scénario nommé avec ses cellules", () => {
    const r = addScenario([], "Pire", [cell("B1", "10")]);
    expect("error" in r).toBe(false);
    if ("error" in r) return;
    expect(r.list).toHaveLength(1);
    expect(r.list[0]).toMatchObject({ name: "Pire", cells: [cell("B1", "10")] });
    expect(r.list[0].id).toBeTruthy();
  });

  it("refuse plus de 32 cellules variables, avec un message explicite", () => {
    expect(MAX_SCENARIO_CELLS).toBe(32);
    const many = Array.from({ length: 33 }, (_, i) => cell(`A${i + 1}`, "1"));
    const r = addScenario([], "Trop", many);
    expect(r).toEqual({ error: "Un scénario est limité à 32 cellules variables (ici : 33)." });
  });

  it("accepte exactement 32 cellules", () => {
    const max = Array.from({ length: 32 }, (_, i) => cell(`A${i + 1}`, "1"));
    expect("list" in addScenario([], "Max", max)).toBe(true);
  });

  it("refuse un nom vide ou déjà pris (sans casse)", () => {
    const first = addScenario([], "Base", [cell("B1", "1")]);
    if ("error" in first) throw new Error("setup");
    expect("error" in addScenario(first.list, "", [cell("B1", "1")])).toBe(true);
    expect("error" in addScenario(first.list, "base", [cell("B1", "2")])).toBe(true);
  });

  it("refuse un scénario sans cellule", () => {
    expect("error" in addScenario([], "Vide", [])).toBe(true);
  });
});

describe("removeScenario", () => {
  it("retire le scénario par identifiant", () => {
    const r = addScenario([], "A", [cell("B1", "1")]);
    if ("error" in r) throw new Error("setup");
    expect(removeScenario(r.list, r.list[0].id)).toEqual([]);
  });
});

describe("captureCells / applyScenario", () => {
  it("capture les valeurs brutes des clés de la sélection", () => {
    const sheet = createSheet();
    setCell(sheet, "B1", "=2*3");
    setCell(sheet, "B2", "'texte");
    const cells = captureCells("s1", sheet, ["B1", "B2", "B3"]);
    expect(cells).toEqual([cell("B1", "=2*3"), cell("B2", "'texte"), cell("B3", "")]);
  });

  it("applique les valeurs et recalcule les formules dépendantes", () => {
    const sheet = createSheet();
    setCell(sheet, "A1", "5");
    setCell(sheet, "B1", "=A1*2");
    applyScenario(sheet, [cell("A1", "21")]);
    expect(getRaw(sheet, "A1")).toBe("21");
    expect(getValue(sheet, "B1")).toBe(42);
  });

  it("une cellule vide efface la valeur", () => {
    const sheet = createSheet();
    setCell(sheet, "A1", "5");
    applyScenario(sheet, [cell("A1", "")]);
    expect(getRaw(sheet, "A1")).toBe("");
  });
});

describe("selectionCells", () => {
  it("capture toutes les cellules d'une plage (vides incluses)", () => {
    const sheet = createSheet();
    setCell(sheet, "A2", "7");
    const cells = selectionCells("s1", sheet, "A1:B2");
    expect(cells.map((c) => c.key)).toEqual(["A1", "B1", "A2", "B2"]);
    expect(cells[2]).toEqual(cell("A2", "7"));
  });

  it("accepte une cellule seule et renvoie [] pour une adresse invalide", () => {
    const sheet = createSheet();
    expect(selectionCells("s1", sheet, "C3")).toEqual([cell("C3", "")]);
    expect(selectionCells("s1", sheet, "??")).toEqual([]);
  });
});
