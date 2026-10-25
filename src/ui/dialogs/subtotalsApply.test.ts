// @vitest-environment jsdom
/** Application et suppression des sous-totaux sur la sélection (écriture via app.editMany). */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { applySubtotals, forgetSubtotalPlans, removeSubtotals } from "./subtotalsApply";
import type { App } from "../appTypes";

const OPTS = { groups: [0], values: [1], fn: "SUM" as const, header: true };

/** Faux classeur : cellules brutes, sélection, identifiant de feuille ; écritures espionnées. */
const fake = (cells: Record<string, string>, keys: string[], id = "s1") => {
  const editMany = vi.fn();
  const setOutlineLevels = vi.fn();
  const raw = Object.fromEntries(Object.entries(cells).map(([k, v]) => [k, { raw: v }]));
  const app = {
    editMany, setOutlineLevels, selectedKeys: () => keys, activeDoc: () => ({ cells: raw }), activeDocId: () => id,
  } as unknown as App;
  return { app, editMany, setOutlineLevels };
};

const SHEET = { A1: "Cat", B1: "Montant", A2: "x", B2: "1", A3: "x", B3: "2" };
const SEL = ["A1", "B1", "A2", "B2", "A3", "B3"];

beforeEach(() => forgetSubtotalPlans());

describe("applySubtotals", () => {
  it("écrit le plan sous la sélection et pose les niveaux du plan", () => {
    const { app, editMany, setOutlineLevels } = fake(SHEET, SEL);
    expect(applySubtotals(app, OPTS)).toBeNull();
    expect(editMany).toHaveBeenCalledWith({
      A1: "Cat", B1: "Montant", A2: "x", B2: "1", A3: "x", B3: "2",
      A4: "Total x", B4: "3", A5: "Total général", B5: "3",
    });
    expect(setOutlineLevels).toHaveBeenCalledWith([0, 1, 1, 0, 0]);
  });

  it("sélection vide : message, aucune écriture", () => {
    const { app, editMany } = fake(SHEET, []);
    expect(applySubtotals(app, OPTS)).toMatch(/sélection/i);
    expect(editMany).not.toHaveBeenCalled();
  });

  it("aucune colonne à totaliser : message, aucune écriture", () => {
    const { app, editMany } = fake(SHEET, SEL);
    expect(applySubtotals(app, { ...OPTS, values: [] })).toMatch(/colonne/i);
    expect(editMany).not.toHaveBeenCalled();
  });

  it("refuse si des cellules sous la sélection seraient écrasées", () => {
    const { app, editMany } = fake({ ...SHEET, A4: "zzz" }, SEL);
    expect(applySubtotals(app, OPTS)).toMatch(/écras/i);
    expect(editMany).not.toHaveBeenCalled();
  });
});

describe("removeSubtotals", () => {
  it("sans plan appliqué : faux, aucune écriture", () => {
    const { app, editMany } = fake(SHEET, SEL, "sans-plan");
    expect(removeSubtotals(app)).toBe(false);
    expect(editMany).not.toHaveBeenCalled();
  });

  it("restaure les cellules d'origine et retire le plan", () => {
    const first = fake(SHEET, SEL, "rest");
    applySubtotals(first.app, OPTS);
    const second = fake(SHEET, SEL, "rest");
    expect(removeSubtotals(second.app)).toBe(true);
    expect(second.editMany).toHaveBeenCalledWith(expect.objectContaining({ A4: "", B4: "", A5: "", B5: "", A1: "Cat" }));
    expect(second.setOutlineLevels).toHaveBeenCalledWith([]);
    expect(removeSubtotals(second.app)).toBe(false);
  });

  it("autre feuille que celle du plan : faux, aucune écriture", () => {
    const first = fake(SHEET, SEL, "une");
    applySubtotals(first.app, OPTS);
    const other = fake(SHEET, SEL, "autre");
    expect(removeSubtotals(other.app)).toBe(false);
    expect(other.editMany).not.toHaveBeenCalled();
  });
});
