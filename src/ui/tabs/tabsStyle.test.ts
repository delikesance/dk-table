// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { createSheetTabs } from "./tabs";

// @ts-ignore @types/node absent ; vitest neutralise `?raw` sur les .css, d'où fs.
import { readFileSync } from "node:fs";
const css = (readFileSync as (p: string, e: string) => string)("src/ui/tabs/tabs.css", "utf8");
/** Declarations of the first rule whose selector contains `sel`. */
function rule(sel: string): string {
  const m = new RegExp(`${sel.replace(/[.[\]]/g, "\\$&")}[^{}]*\\{([^}]*)\\}`).exec(css);
  return m ? m[1] : "";
}

describe("sheet tabs visual state", () => {
  it("active tab: solid Hermes blue, paper text (both themes)", () => {
    const r = rule(".dk-tabs .dk-tab--active");
    expect(r).toContain("background: var(--c-accent-solid)");
    expect(r).toContain("color: var(--c-text-on-solid)");
  });
  it("tab labels: condensed caps (display font)", () => {
    const r = rule(".dk-tabs .dk-tab ");
    expect(r).toContain("var(--font-display)");
    expect(r).toMatch(/text-transform:\s*uppercase/);
  });
  it("inactive tabs use text-2", () => {
    expect(rule(".dk-tabs .dk-tab ")).toContain("var(--c-text-2)");
  });
  it("add button is >= 28px with a title", () => {
    const r = rule(".dk-tabs .dk-tab--add");
    expect(r).toMatch(/width:\s*(2[89]|3\d)px/);
    expect(r).toMatch(/height:\s*(2[89]|3\d)px/);
    const host = document.createElement("div");
    createSheetTabs(host, { onAdd() {}, onRename() {}, onDelete() {}, onSwitch() {} }).setSheets([{ id: "a", name: "A" }]);
    const add = host.querySelector<HTMLElement>(".dk-tab--add")!;
    expect(add.title).toBe("Ajouter une feuille");
    expect(add.getAttribute("aria-label")).toBe("Ajouter une feuille");
  });
  it("no hex colors", () => { expect(css).not.toMatch(/#[0-9a-f]{3,6}\b/i); });
});
