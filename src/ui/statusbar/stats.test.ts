// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { selectionStats, statItems } from "./stats";
import { createStatusBar } from "./statusbar";

describe("selectionStats", () => {
  it("computes sum, avg, min, max, counts", () => {
    const s = selectionStats([1, 2, "a", "", 6, true]);
    expect(s).toEqual({ count: 5, numCount: 3, sum: 9, avg: 3, min: 1, max: 6 });
  });
  it("has no numeric stats without numbers", () => {
    expect(selectionStats(["a", ""])).toEqual({ count: 1, numCount: 0 });
  });
});

describe("statItems", () => {
  it("is empty for fewer than 2 cells", () => {
    expect(statItems(1, [5])).toEqual([]);
  });
  it("lists the six figures in order (fr-FR)", () => {
    const l = statItems(3, [1, 2, 3.5]).map((i) => i.label);
    expect(l).toEqual(["Moyenne", "Nb", "Nb numérique", "Min", "Max", "Somme"]);
    expect(statItems(3, [1, 2, 3.5]).find((i) => i.label === "Somme")!.value).toBe("6,5");
  });
  it("filters by enabled labels", () => {
    expect(statItems(3, [1, 2, 3], ["Somme", "Max"]).map((i) => i.label)).toEqual(["Max", "Somme"]);
  });
  it("only shows Nb when no number", () => {
    expect(statItems(2, ["a", "b"]).map((i) => i.label)).toEqual(["Nb"]);
  });
});

describe("createStatusBar", () => {
  it("renders items and hides when empty", () => {
    const sb = createStatusBar();
    sb.update(2, [4, 6]);
    expect(sb.el.hidden).toBe(false);
    expect(sb.el.textContent).toContain("Somme");
    expect(sb.el.querySelector('[data-stat="Somme"]')!.textContent).toContain("10");
    sb.update(1, [4]);
    expect(sb.el.hidden).toBe(true);
  });
  it("menu toggles entries and persists them", () => {
    localStorage.clear();
    const sb = createStatusBar();
    sb.update(2, [4, 6]);
    (sb.el.querySelector(".dk-status__btn") as HTMLElement).click();
    const box = sb.el.querySelector('input[data-stat-opt="Somme"]') as HTMLInputElement;
    expect(box.checked).toBe(true);
    box.click();
    expect(sb.el.querySelector('[data-stat="Somme"]')).toBeNull();
    expect(JSON.parse(localStorage.getItem("dk-table.statusbar")!)).not.toContain("Somme");
    const sb2 = createStatusBar();
    sb2.update(2, [4, 6]);
    expect(sb2.el.querySelector('[data-stat="Somme"]')).toBeNull();
    expect(sb2.el.querySelector('[data-stat="Max"]')).not.toBeNull();
  });
});
