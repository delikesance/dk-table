import { describe, it, expect } from "vitest";
import { distinctValues, buildMask, combineMasks, hiddenRows, EMPTY_LABEL } from "./filter";

const rows = [
  ["Nom", "Ville"],
  ["a", "Paris"],
  ["b", ""],
  ["a", "Lyon"],
  ["", "Paris"],
];

describe("filter", () => {
  it("distinctValues: tri, comptage, vides regroupés", () => {
    const d = distinctValues(["b", "a", "", "a", ""]);
    expect(d).toEqual([
      { value: "a", count: 2 },
      { value: "b", count: 1 },
      { value: EMPTY_LABEL, count: 2 },
    ]);
  });
  it("distinctValues: respecte max", () => {
    expect(distinctValues(["a", "b", "c"], 2)).toHaveLength(2);
  });
  it("buildMask simple", () => {
    expect(buildMask(rows, 0, new Set(["a"]))).toEqual([false, true, false, true, false]);
  });
  it("buildMask: vides via (Vides)", () => {
    expect(buildMask(rows, 1, new Set([EMPTY_LABEL]))).toEqual([false, false, true, false, false]);
  });
  it("buildMask: null = tout visible", () => {
    expect(buildMask(rows, 0, null)).toEqual([true, true, true, true, true]);
  });
  it("buildMask: hasHeader garde la ligne 0", () => {
    expect(buildMask(rows, 0, new Set(["a"]), { hasHeader: true })).toEqual([true, true, false, true, false]);
  });
  it("combineMasks: ET de deux colonnes", () => {
    const m = combineMasks([buildMask(rows, 0, new Set(["a"])), buildMask(rows, 1, new Set(["Paris"]))]);
    expect(m).toEqual([false, true, false, false, false]);
  });
  it("combineMasks: liste vide", () => {
    expect(combineMasks([])).toEqual([]);
  });
  it("hiddenRows", () => {
    expect(hiddenRows([true, false, true, false])).toEqual([1, 3]);
  });
});
