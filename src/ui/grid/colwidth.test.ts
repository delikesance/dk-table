// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { clampWidth, templateColumns, fitWidth } from "./colwidth";
import { createGrid } from "./grid";
import type { GridView } from "./types";

describe("colwidth (pur)", () => {
  it("clampWidth borne 32..800", () => {
    expect(clampWidth(5)).toBe(32);
    expect(clampWidth(5000)).toBe(800);
    expect(clampWidth(120)).toBe(120);
  });
  it("templateColumns: défaut var, px si largeur connue", () => {
    expect(templateColumns({ 1: 120 }, 3)).toBe("var(--row-header-w) var(--cell-w) 120px var(--cell-w)");
  });
  it("fitWidth suit le texte le plus long, borné", () => {
    expect(fitWidth(["a", "abcdefghij"])).toBeGreaterThan(fitWidth(["a"]));
    expect(fitWidth([])).toBe(fitWidth([""]));
    expect(fitWidth(["x".repeat(500)])).toBe(800);
  });
});

describe("grille: largeur de colonne", () => {
  let host: HTMLElement;
  let view: GridView;
  const raw: Record<string, string> = { A1: "un texte assez long pour la colonne" };
  const mk = () => createGrid(host, { cols: 3, rows: 20, getDisplay: (k) => raw[k] ?? "", getRaw: (k) => raw[k] ?? "", onEdit: () => {}, view });
  const root = () => host.querySelector(".dkg") as HTMLElement;
  const handle = (c: number) => host.querySelectorAll(".dkg-colh")[c].querySelector(".dkg-resizer") as HTMLElement;
  beforeEach(() => {
    host = document.createElement("div");
    document.body.replaceChildren(host);
    view = { widths: {}, filters: {} };
  });
  it("glisser la poignée fixe la largeur (mémorisée dans la vue)", () => {
    mk();
    handle(0).dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 100 }));
    document.dispatchEvent(new MouseEvent("mousemove", { clientX: 160 }));
    document.dispatchEvent(new MouseEvent("mouseup"));
    expect(view.widths[0]).toBeGreaterThan(100);
    expect(root().style.gridTemplateColumns).toContain(`${view.widths[0]}px`);
  });
  it("double-clic ajuste au contenu", () => {
    mk();
    handle(0).dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    expect(view.widths[0]).toBeGreaterThan(150);
  });
  it("largeurs de la vue réappliquées à la reconstruction", () => {
    view.widths[1] = 210;
    mk();
    expect(root().style.gridTemplateColumns).toContain("210px");
  });
  it("la poignée ne change pas la sélection", () => {
    const g = mk();
    handle(0).dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 0 }));
    document.dispatchEvent(new MouseEvent("mouseup"));
    expect(g.getSelection()).toBe("A1");
  });
});
