// @vitest-environment jsdom
import { describe, it, expect } from "vitest";

// @ts-ignore @types/node absent ; vitest neutralise `?raw` sur les .css, d'où fs.
import { readFileSync } from "node:fs";
const css = (readFileSync as (p: string, e: string) => string)("src/ui/sidebar/sidebar.css", "utf8");
/** Declarations of the first rule whose selector contains `sel`. */
function rule(sel: string): string {
  const m = new RegExp(`${sel.replace(/[.[\]+]/g, "\\$&")}[^{}]*\\{([^}]*)\\}`).exec(css);
  return m ? m[1] : "";
}

describe("sidebar visual hierarchy", () => {
  it("section headers: readable color, bold, divider", () => {
    const r = rule(".dk-sidebar .dk-section__head");
    expect(r).toContain("var(--c-text-2)");
    expect(r).toContain("var(--fw-semibold)");
    expect(rule(".dk-sidebar .dk-section + .dk-section")).toContain("border-top");
  });
  it("function signature is mono with contrast", () => {
    const r = rule(".dk-sidebar .dk-item__meta");
    expect(r).toContain("var(--font-mono)");
    expect(r).toContain("var(--c-text-2)");
  });
  it("function rows are 28px", () => {
    expect(rule(".dk-fn-list .dk-item")).toMatch(/height:\s*28px/);
  });
  it("Cellule panel is framed", () => {
    const r = rule(".dk-cellinfo");
    expect(r).toContain("border: 0.5px solid var(--c-line");
    expect(r).toContain("background: var(--c-surface)");
  });
  it("uses tokens only (no hex colors)", () => {
    expect(css).not.toMatch(/#[0-9a-f]{3,6}\b/i);
  });
});
