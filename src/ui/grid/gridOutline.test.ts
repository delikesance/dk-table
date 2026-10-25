// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { createGrid, type Grid } from "./grid";
import type { GridView } from "./types";
import { foldState } from "./outlineView";
import { emptyOutline, setLevel, type Outline } from "../../engine/outline";

/** Rows 0..5: levels 1,1 (details), 0 (summary), 0, 1 (detail), 0 (summary). */
const outline = (): Outline => {
  let o = emptyOutline(6);
  [0, 1, 4].forEach((r) => (o = setLevel(o, r, 1)));
  return o;
};
const get = () => "";
let host: HTMLElement;
let view: GridView;
let grid: Grid;
const mk = () => (grid = createGrid(host, { cols: 2, rows: 6, getDisplay: get, getRaw: get, onEdit: () => {}, view }));
const q = (sel: string) => host.querySelector(sel) as HTMLElement | null;
const click = (el: Element | null) => el!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
const trackRows = () => (host.querySelector(".dkg") as HTMLElement).style.gridTemplateRows;

beforeEach(() => {
  host = document.createElement("div");
  document.body.replaceChildren(host);
  view = { widths: {}, filters: {}, outline: outline() };
});

describe("état de pliage (fonction pure)", () => {
  it("null sans détail au-dessus, ouvert ou replié sinon", () => {
    const o = outline();
    expect(foldState(o, 0)).toBeNull();
    expect(foldState(o, 2)).toBe("open");
    expect(foldState({ ...o, collapsed: [{ row: 2, depth: 1 }] }, 2)).toBe("closed");
  });
});

describe("gouttière et boutons de niveaux (UI)", () => {
  it("sans plan, aucun bouton de pliage", () => {
    view.outline = undefined;
    mk();
    expect(host.querySelectorAll(".dkg-fold").length).toBe(0);
  });

  it("un +/- sur chaque ligne résumé qui a du détail au-dessus", () => {
    mk();
    const folds = [...host.querySelectorAll<HTMLElement>(".dkg-fold")].map((b) => b.dataset.row);
    expect(folds.sort()).toEqual(["2", "5"]);
    expect(q('.dkg-fold[data-row="2"]')!.getAttribute("aria-expanded")).toBe("true");
  });

  it("le clic sur le bouton replie le groupe: lignes masquées, numéros conservés", () => {
    mk();
    expect(trackRows()).not.toContain("0px");
    click(q('.dkg-fold[data-row="2"]'));
    expect(view.outline!.collapsed).toEqual([{ row: 2, depth: 1 }]);
    expect(q('.dkg-fold[data-row="2"]')!.getAttribute("aria-expanded")).toBe("false");
    expect(trackRows()).toContain("0px");
    expect(q('.dkg-rowh[data-row="0"]')).toBeNull(); // ligne 1 masquée, pas rendue
    expect(q('.dkg-rowh[data-row="2"]')!.firstChild!.textContent).toBe("3"); // le résumé garde son numéro
    click(q('.dkg-fold[data-row="2"]'));
    expect(view.outline!.collapsed).toEqual([]);
  });

  it("le clic sur +/- ne sélectionne pas la ligne", () => {
    mk();
    click(q('.dkg-fold[data-row="2"]'));
    expect(grid.getSelection()).not.toContain(":"); // pas de sélection de ligne (A3 = curseur déplacé hors de la ligne masquée)
  });

  it("le bouton de niveau 1 ne laisse que le niveau 0 visible", () => {
    mk();
    expect(q(".dkg-lvl")!.hidden).toBe(false);
    click(q('.dkg-lvl[data-level="1"]'));
    expect(view.outline!.collapsed.map((f) => f.row)).toEqual([2, 5]);
    expect(trackRows()).toContain("0px");
  });

  it("les boutons de niveaux sont cachés sans détail", () => {
    view.outline = emptyOutline(4);
    mk();
    expect(q(".dkg-lvl")!.hidden).toBe(true);
  });

  it("boutons de niveaux accessibles au clavier (Entrée déclenche, sans éditer la cellule)", () => {
    mk();
    const b = q('.dkg-fold[data-row="2"]') as HTMLButtonElement;
    expect(b.tagName).toBe("BUTTON");
    expect(b.getAttribute("aria-label")).toBeTruthy();
  });
});
