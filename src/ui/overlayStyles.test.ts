// @vitest-environment jsdom
/** Tests de style des overlays (palette, popover de filtre, menu contextuel, toast): lecture du CSS source. */
import { describe, it, expect } from "vitest";
// @ts-ignore @types/node absent
import { readFileSync } from "node:fs";
import { openFilterPopover } from "./grid/filterPopover";

const css = (p: string): string => (readFileSync as (p: URL, e: string) => string)(new URL(p, import.meta.url), "utf8");
/** Corps de la première règle dont le sélecteur est exactement `sel`. */
const rule = (src: string, sel: string): string => {
  const lines = src.split("\n");
  const i = lines.findIndex((l) => l.startsWith(`${sel} {`) || l.startsWith(`${sel}{`));
  if (i < 0) return "";
  return lines.slice(i).join("\n").match(/\{([^}]*)\}/)![1];
};

describe("palette", () => {
  const c = css("./palette/palette.css");
  it("sélection = accent doux, pas plein", () => {
    const r = rule(c, ".dk-palette__item--selected");
    expect(r).toContain("--c-accent-soft");
    expect(r).not.toMatch(/background:\s*var\(--c-accent\)/);
  });
  it("badge sélectionné sans bordure currentColor", () => {
    expect(c).not.toMatch(/border-color:\s*currentColor/);
  });
  it("liste: dégradé de fin + marge basse", () => {
    expect(rule(c, ".dk-palette__list")).toMatch(/padding-bottom|mask-image/);
  });
  it("champ de saisie plus grand que les items", () => {
    expect(rule(c, ".dk-palette__input")).toContain("var(--fs-lg)");
  });
});

describe("popover de filtre", () => {
  const c = css("./grid/filterPopover.css");
  it("cases à l'accent, compteur discret, OK primaire", () => {
    expect(c).toContain("accent-color: var(--c-accent)");
    expect(rule(c, ".dkg-pop__n")).toContain("--fs-xs");
    expect(rule(c, '.dkg-pop__btns [data-act="ok"]')).toContain("--c-accent");
    expect(rule(c, '.dkg-pop__btns button')).toContain("transparent");
  });
  it("« Tout sélectionner » coche/décoche tout; (Vides) atténué", () => {
    const a = document.createElement("button");
    document.body.append(a);
    openFilterPopover({ anchor: a, values: [{ value: "a", count: 1 }, { value: "(Vides)", count: 9 }], selected: null, onApply() {} });
    const all = document.querySelector<HTMLInputElement>("input[data-all]")!;
    expect(all.closest("label")!.textContent).toContain("Tout sélectionner");
    all.checked = false;
    all.dispatchEvent(new Event("change", { bubbles: true }));
    const vs = [...document.querySelectorAll<HTMLInputElement>("input[data-v]")];
    expect(vs.every((b) => !b.checked)).toBe(true);
    expect(vs[1].closest("label")!.classList.contains("dkg-pop__empty")).toBe(true);
  });
});

describe("popover de filtre: recherche", () => {
  const open = (): void => {
    document.body.innerHTML = "";
    const a = document.createElement("button");
    document.body.append(a);
    const values = [{ value: "Paris", count: 2 }, { value: "Lyon", count: 1 }, { value: "Élodie", count: 1 }];
    openFilterPopover({ anchor: a, values, selected: null, onApply: (s) => { (window as any).applied = s; } });
  };
  const type = (q: string): void => {
    const s = document.querySelector<HTMLInputElement>(".dkg-pop__search")!;
    s.value = q;
    s.dispatchEvent(new Event("input", { bubbles: true }));
  };
  const visible = (): string[] =>
    [...document.querySelectorAll<HTMLInputElement>("input[data-v]")].filter((i) => !i.closest("label")!.hidden).map((i) => i.dataset.v!);
  it("champ de recherche focalisé à l'ouverture", () => {
    open();
    expect(document.activeElement).toBe(document.querySelector(".dkg-pop__search"));
  });
  it("filtre la liste (accents/casse ignorés)", () => {
    open();
    type("elo");
    expect(visible()).toEqual(["Élodie"]);
    type("");
    expect(visible().length).toBe(3);
  });
  it("Tout sélectionner ne touche que les résultats visibles; OK applique", () => {
    open();
    const all = document.querySelector<HTMLInputElement>("input[data-all]")!;
    all.checked = false;
    all.dispatchEvent(new Event("change", { bubbles: true }));
    type("par");
    all.checked = true;
    all.dispatchEvent(new Event("change", { bubbles: true }));
    const on = [...document.querySelectorAll<HTMLInputElement>("input[data-v]")].filter((i) => i.checked).map((i) => i.dataset.v);
    expect(on).toEqual(["Paris"]);
    document.querySelector<HTMLInputElement>(".dkg-pop__search")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect((window as any).applied).toEqual(["Paris"]);
    expect(document.querySelector(".dkg-pop")).toBeNull();
  });
  it("style en jetons", () => {
    expect(rule(css("./grid/filterPopover.css"), ".dkg-pop__search")).toContain("var(--c-line-strong)");
  });
});

describe("menu contextuel", () => {
  const c = css("./contextmenu/contextmenu.css");
  it("survol doux, séparateur marqué, danger rouge", () => {
    expect(rule(c, ".dk-menu__item--hover")).toContain("--c-accent-soft");
    expect(rule(c, ".dk-menu__sep")).toContain("--c-line-strong");
    expect(c).toMatch(/--danger\.dk-menu__item--hover\s*\{[^}]*--c-error-soft/);
    expect(c).not.toMatch(/border-color:\s*currentColor/);
  });
});

describe("toast", () => {
  const c = css("./toast/toast.css");
  it("bordure fine + action en pilule accent", () => {
    expect(rule(c, ".dk-toast")).toContain("--c-line-strong");
    expect(rule(c, ".dk-toast__action")).toContain("--c-accent-soft");
  });
});
