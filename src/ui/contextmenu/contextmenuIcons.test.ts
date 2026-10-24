// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { showContextMenu } from "./contextmenu";

describe("context menu icons", () => {
  beforeEach(() => { document.body.innerHTML = ""; });
  it("submenu arrow is an Iconoir SVG, not a glyph", () => {
    showContextMenu(0, 0, [{ label: "More", submenu: [{ label: "x" }] }]);
    const a = document.querySelector(".dk-menu__arrow")!;
    expect(a.querySelector("svg.dk-icon")).not.toBeNull();
    expect(a.textContent!.trim()).toBe("");
  });
  it("item with icon name renders its SVG (currentColor)", () => {
    showContextMenu(0, 0, [{ label: "New", icon: "plus" }, { label: "Plain" }]);
    const rows = document.querySelectorAll(".dk-menu__item");
    expect(rows[0].querySelector("svg.dk-icon")!.outerHTML).toContain("currentColor");
    expect(rows[1].querySelector("svg")).toBeNull();
  });
});
