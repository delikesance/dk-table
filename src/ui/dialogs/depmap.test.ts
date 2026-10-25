// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderDepMap } from "./depmap";

describe("renderDepMap", () => {
  const map = {
    precedents: [{ sheetId: "s1", sheet: "Ventes", key: "A1", kind: "cell" as const }],
    dependents: [{ sheetId: "d1", sheet: "Note", key: "", kind: "doc" as const }, { sheetId: "s1", sheet: "Ventes", key: "C1", kind: "live" as const }],
  };
  it("lists both sides and navigates on click", () => {
    const el = document.createElement("div"), go = vi.fn();
    renderDepMap(el, map, go);
    expect(el.querySelectorAll("[data-ref]").length).toBe(3);
    el.querySelector<HTMLElement>('[data-kind="doc"]')!.click();
    expect(go).toHaveBeenCalledWith(map.dependents[0]);
  });
  it("shows an empty message", () => {
    const el = document.createElement("div");
    renderDepMap(el, { precedents: [], dependents: [] }, () => {});
    expect(el.textContent).toContain("Aucun");
  });
});
