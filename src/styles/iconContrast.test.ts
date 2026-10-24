/**
 * Icônes sur fond plein (survol/focus des menus, sélection de palette) : elles doivent prendre la couleur
 * du texte (`currentColor` = --c-text-on-solid), sinon elles restent bleues sur le bleu #0000F2.
 */
import { describe, expect, it } from "vitest";
// @ts-ignore @types/node absent ; vitest neutralise `?raw` sur les .css, d'où fs.
import { readFileSync } from "node:fs";

const read = (f: string): string => (readFileSync as (p: string, e: string) => string)(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const css = ["src/styles/components.css", "src/ui/toolbar/toolbar.css", "src/ui/contextmenu/contextmenu.css", "src/styles/chrome.css"].map(read).join("\n");

/** Déclarations des règles dont la liste de sélecteurs contient `sel` exactement. */
function decls(sel: string): string[] {
  return [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)].filter((m) => m[1].split(",").some((s) => s.trim() === sel)).map((m) => m[2]);
}
const inherits = (sel: string): boolean => decls(sel).some((d) => /color:\s*(currentColor|inherit)/.test(d));

describe("icônes lisibles sur fond plein", () => {
  for (const sel of [
    ".dk-menu__item:hover .dk-icon", ".dk-menu__item:focus .dk-icon", ".dk-menu .dk-menu__item--hover .dk-icon",
    ".dk-palette__item--selected .dk-icon", ".dk-fnpop__item--selected .dk-icon",
  ]) it(sel, () => expect(inherits(sel), sel).toBe(true));
});
