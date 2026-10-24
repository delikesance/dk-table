// @vitest-environment jsdom
/** Design review items 3, 4, 8: compact File menu, toolbar hierarchy, formula bar grouping. */
import { describe, expect, it } from "vitest";
// @ts-ignore @types/node absent; vitest neutralises `?raw` on css, hence fs.
import { readFileSync } from "node:fs";
import { createToolbar } from "./toolbar";
import { createToolsToggle } from "../appTools";

const css = (readFileSync as (p: string, e: string) => string)("src/ui/toolbar/toolbar.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
/** Declarations of the first rule whose selector list contains `sel` exactly. */
function rule(sel: string): string {
  for (const m of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    if (m[1].split(",").some((s) => s.trim() === sel)) return m[2];
  }
  return "";
}
const noop = () => {};
const handlers = {
  onUndo: noop, onRedo: noop, onBold: noop, onItalic: noop, onAlign: noop, onFormat: noop, onFill: noop, onOpen: noop, onSave: noop,
  menus: { onNew: noop, onOpen: noop, onSave: noop, onSaveAs: noop, onImportCsv: noop, onExportCsv: noop },
};

describe("item 3: compact File menu, no layout shift", () => {
  it("menu root overrides the context-menu box (no 220px pill)", () => {
    const r = rule(".dk-menus .dk-menu");
    expect(r).toMatch(/min-width:\s*0/);
    expect(r).toMatch(/background:\s*transparent/);
    expect(r).toMatch(/box-shadow:\s*none/);
    expect(r).toMatch(/backdrop-filter:\s*none/);
  });
  it("trigger is a compact token-based button with fixed height", () => {
    const r = rule(".dk-menu__trigger");
    expect(r).toMatch(/height:\s*32px/);
    expect(r).toMatch(/border-radius:\s*var\(--r-md\)/);
    expect(css).not.toMatch(/#fff\b/i);
  });
  it("toolbar height is fixed, same open and closed", () => {
    expect(rule(".dk-toolbar")).toMatch(/height:\s*var\(--toolbar-h\)/);
    expect(rule(".dk-toolbar")).toMatch(/box-sizing:\s*border-box/);
  });
  it("File trigger has a tooltip", () => {
    const tb = createToolbar(document.body, handlers);
    const t = tb.el.querySelector<HTMLElement>(".dk-menu__trigger")!;
    expect(t.title).toMatch(/Fichier/);
  });
});

describe("item 4: toolbar hierarchy", () => {
  it("no heavy 2px accent rule under the bar", () => {
    expect(rule(".dk-toolbar")).not.toMatch(/2px[^;]*accent/);
    expect(rule(".dk-toolbar")).toMatch(/border-bottom:\s*0\.5px/);
  });
  it("active button = soft accent bg + 2px accent underline", () => {
    const r = rule(".dk-toolbar .dk-iconbtn--active");
    expect(r).toMatch(/background:\s*var\(--c-accent-soft/);
    expect(r).toMatch(/inset 0 -2px 0 var\(--c-accent\)/);
  });
  it("icons are 20px", () => {
    expect(rule(".dk-toolbar .dk-iconbtn svg")).toMatch(/width:\s*20px/);
  });
  it("separators use the strong line token", () => {
    expect(rule(".dk-toolbar .dk-toolsep")).toMatch(/var\(--c-line-strong\)/);
  });
  it("tooltips carry shortcuts", () => {
    const tb = createToolbar(document.body, handlers);
    const titles = [...tb.el.querySelectorAll<HTMLElement>(".dk-iconbtn")].map((b) => b.title).join("|");
    for (const k of ["Ctrl+Z", "Ctrl+Y", "Ctrl+B", "Ctrl+I", "Ctrl+O", "Ctrl+S"]) expect(titles).toContain(k);
  });
});

describe("item 8: formula bar + tools toggle", () => {
  it("fx is accent-coloured, name box grouped", () => {
    expect(rule(".dk-app__bar .dk-formula__fx")).toMatch(/color:\s*var\(--c-accent\)/);
    expect(rule(".dk-app__bar .dk-formula__name")).toMatch(/background:\s*var\(--c-surface-2\)/);
  });
  it("toggle: visible label, aria-label and title 'Outils (Ctrl+J)'", () => {
    const b = createToolsToggle();
    expect(b.getAttribute("aria-label")).toBe("Outils (Ctrl+J)");
    expect(b.title).toBe("Outils (Ctrl+J)");
    expect(b.textContent).toContain("Outils");
  });
});
