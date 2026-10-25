/** Plan de sous-totaux : lignes de sortie et niveaux du plan (pur). */
import { describe, expect, it } from "vitest";
import { buildSubtotalPlan } from "./subtotalsPlan";

const table = [["A", "1"], ["A", "2"], ["B", "5"]];

describe("buildSubtotalPlan", () => {
  it("insère les sous-totaux et le total général, niveaux du plan", () => {
    const { rows, levels } = buildSubtotalPlan(table, false, { groups: [0], values: [1], fn: "SUM" });
    expect(rows).toEqual([
      ["A", "1"], ["A", "2"], ["Total A", "3"],
      ["B", "5"], ["Total B", "5"], ["Total général", "8"],
    ]);
    expect(levels).toEqual([1, 1, 0, 1, 0, 0]);
  });

  it("garde la ligne d'en-tête en tête, sans la trier", () => {
    const withHeader = [["Cat", "Montant"], ...table];
    const { rows, levels } = buildSubtotalPlan(withHeader, true, { groups: [0], values: [1], fn: "SUM" });
    expect(rows[0]).toEqual(["Cat", "Montant"]);
    expect(levels[0]).toBe(0);
    expect(rows).toHaveLength(levels.length);
    expect(rows.slice(1)).toEqual(buildSubtotalPlan(table, false, { groups: [0], values: [1], fn: "SUM" }).rows);
  });

  it("sans colonne de groupe : données puis total général seul, tout au niveau 0", () => {
    const { rows, levels } = buildSubtotalPlan(table, false, { groups: [], values: [1], fn: "SUM" });
    expect(rows).toHaveLength(4);
    expect(rows[3][0]).toBe("Total général");
    expect(levels).toEqual([0, 0, 0, 0]);
  });

  it("plage vide : aucune ligne", () => {
    expect(buildSubtotalPlan([], false, { groups: [0], values: [1], fn: "SUM" })).toEqual({ rows: [], levels: [] });
  });
});
