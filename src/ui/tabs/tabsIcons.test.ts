// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { createSheetTabs } from "./tabs";

describe("tabs icons", () => {
  it("add button shows an Iconoir SVG (currentColor), no glyph text", () => {
    const host = document.createElement("div");
    const t = createSheetTabs(host, { onAdd: vi.fn(), onRename: vi.fn(), onDelete: vi.fn(), onSwitch: vi.fn() });
    t.setSheets([{ id: "a", name: "A" }]);
    const add = host.querySelector<HTMLElement>(".dk-tab--add")!;
    const svg = add.querySelector("svg.dk-icon")!;
    expect(svg).not.toBeNull();
    expect(svg.outerHTML).toContain("currentColor");
    expect(add.textContent!.trim()).toBe("");
  });
});
