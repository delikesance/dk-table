// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { createSidebar } from "./sidebar";

/** Build a sidebar with spies. */
function setup() {
  const host = document.createElement("div");
  const s = createSidebar(host, { functions: [], onInsert: vi.fn(), onOpenRecent: vi.fn() });
  return { host, s };
}

describe("sidebar icons", () => {
  it("section headers show an Iconoir SVG chevron (currentColor)", () => {
    const { host } = setup();
    const heads = [...host.querySelectorAll(".dk-section__head")];
    expect(heads).toHaveLength(3);
    for (const h of heads) {
      const svg = h.querySelector("svg.dk-icon")!;
      expect(svg).not.toBeNull();
      expect(svg.outerHTML).toContain("currentColor");
    }
  });
  it("recent files show an Iconoir SVG before the name", () => {
    const { host, s } = setup();
    s.setRecent([{ path: "/a.dktable", name: "a.dktable" }]);
    const li = host.querySelector(".dk-recent .dk-item")!;
    expect(li.querySelector("svg.dk-icon")).not.toBeNull();
    expect(li.textContent!.trim()).toBe("a.dktable");
  });
});
