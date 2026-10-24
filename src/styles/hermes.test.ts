/**
 * Refonte « Hermes » : bleu #0000F2 + papier (clair), nuit #19192F (sombre), polices locales,
 * chrome bleu (barres du haut) qui remappe les tokens sémantiques. Lecture des CSS source.
 */
import { describe, expect, it } from "vitest";
// @ts-ignore @types/node absent ; vitest neutralise `?raw` sur les .css, d'où fs.
import { readFileSync } from "node:fs";

const read = (f: string): string => (readFileSync as (p: string, e: string) => string)(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const tokens = read("src/styles/tokens.css");
const dark = read("src/styles/theme-dark.css");
const chrome = read("src/styles/chrome.css");
const fonts = read("src/styles/fonts.ts");

/** Variables déclarées dans un bloc CSS. */
function vars(css: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of css.matchAll(/(--[\w-]+):\s*([^;]+?);/g)) out[m[1]] = m[2].trim();
  return out;
}
const light = vars(tokens);
const night = { ...light, ...vars(dark) };

describe("palette Hermes (clair)", () => {
  it("accent et chrome = bleu Hermes #0000F2, texte papier", () => {
    expect(light["--c-accent"]).toMatch(/#0000f2/i);
    expect(light["--c-chrome"]).toMatch(/#0000f2/i);
    expect(light["--c-chrome-text"]).toMatch(/#f2f2f2/i);
  });
  it("grille sur papier, encre bleue", () => {
    expect(light["--c-surface"]).toMatch(/#fafafa/i);
    expect(light["--c-bg"]).toMatch(/#f2f2f2/i);
    expect(light["--c-text"]).toMatch(/#0000f2/i);
  });
  it("angles nets : rayons <= 4px (hors pilule)", () => {
    for (const k of ["--r-xs", "--r-sm", "--r-md", "--r-lg"]) expect(parseFloat(light[k]), k).toBeLessThanOrEqual(4);
  });
});

describe("thème sombre « nuit Hermes »", () => {
  it("déclaré sur :root[data-theme=dark]", () => expect(dark).toMatch(/:root\[data-theme="dark"\]/));
  it("fond #19192F, texte papier, boutons pleins #0000F2", () => {
    expect(night["--c-bg"]).toMatch(/#19192f/i);
    expect(night["--c-text"]).toMatch(/#f2f2f2/i);
    expect(night["--c-accent-solid"]).toMatch(/#0000f2/i);
  });
});

describe("éditeur de code (macros Lua)", () => {
  const keys = ["--c-code-bg", "--c-code-text", "--c-code-keyword", "--c-code-string", "--c-code-number", "--c-code-comment", "--c-code-error", "--c-code-selection"];
  it("tokens --c-code-* définis en clair, fond bleu profond", () => {
    for (const k of keys) expect(light[k], k).toBeTruthy();
    expect(light["--c-code-bg"]).toMatch(/#0000a6/i);
  });
  it("fond de code propre au thème sombre", () => expect(vars(dark)["--c-code-bg"]).toBeTruthy());
});

describe("typographie locale", () => {
  it("familles Inter Tight / DM Mono / Sofia Sans Extra Condensed", () => {
    expect(light["--font-ui"]).toContain("Inter Tight");
    expect(light["--font-mono"]).toContain("DM Mono");
    expect(light["--font-display"]).toContain("Sofia Sans Extra Condensed");
  });
  it("fichiers de police embarqués (aucun réseau)", () => {
    for (const p of ["@fontsource/inter-tight", "@fontsource/dm-mono", "@fontsource/sofia-sans-extra-condensed"]) expect(fonts).toContain(p);
    expect(fonts).not.toMatch(/https?:/);
  });
});

describe("chrome bleu", () => {
  it("la barre du haut prend le fond chrome et remappe le texte", () => {
    const top = chrome.match(/\.dk-app__top\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(top).toMatch(/background:\s*var\(--c-chrome\)/);
    expect(top).toMatch(/--c-text:\s*var\(--c-chrome-text\)/);
  });
  it("les popups du chrome repassent sur papier", () => {
    expect(chrome).toMatch(/\.dk-app__top \.dk-menu__list/);
  });
});
