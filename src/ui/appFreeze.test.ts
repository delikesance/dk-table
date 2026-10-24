// @vitest-environment jsdom
/** Frozen panes at app level: palette commands, per-sheet state, persistence in .dktable. */
import { beforeEach, describe, expect, it } from "vitest";
import { mount, type App } from "./app";
import { defaultRegistry } from "./palette/registry";

let app: App;
let root: HTMLElement;
const cell = (k: string) => root.querySelector<HTMLElement>(`.dkg-cell[data-key="${k}"]`);
const run = (id: string) => defaultRegistry.list().find((c) => c.id === id)!.run();
const freezeOf = () => app.toDoc().sheets.find((s) => s.id === app.toDoc().active)!.freeze;

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app")!;
  app = mount(root);
});

describe("freeze commands", () => {
  it("registers the four French palette commands", () => {
    const labels = defaultRegistry.list().map((c) => c.label);
    for (const l of ["Figer la première ligne", "Figer la première colonne", "Figer jusqu'à la cellule active", "Libérer les volets"])
      expect(labels).toContain(l);
  });
  it("first row / first column", () => {
    run("view.freeze-row");
    expect(freezeOf()).toEqual({ rows: 1, cols: 0 });
    expect(cell("C1")!.classList.contains("dkg-frozen")).toBe(true);
    run("view.freeze-col");
    expect(freezeOf()).toEqual({ rows: 0, cols: 1 });
    expect(cell("A5")!.classList.contains("dkg-frozen")).toBe(true);
    expect(cell("C1")!.classList.contains("dkg-frozen")).toBe(false);
  });
  it("up to the active cell, then unfreeze; keeps the selection and marks dirty", () => {
    app.select("C4");
    app.markSaved();
    run("view.freeze-cell");
    expect(freezeOf()).toEqual({ rows: 3, cols: 2 });
    expect(app.selection()).toBe("C4");
    expect(app.dirty).toBe(true);
    run("view.unfreeze");
    expect(freezeOf()).toBeUndefined();
    expect(root.querySelector(".dkg-frozen")).toBeNull();
  });
  it("is per sheet and survives sheet switches", () => {
    run("view.freeze-row");
    const first = app.sheets()[0].id;
    app.addSheet();
    expect(root.querySelector(".dkg-frozen")).toBeNull();
    app.switchSheet(first);
    expect(cell("A1")!.classList.contains("dkg-frozen")).toBe(true);
  });
  it("loads freeze from a document", () => {
    app.loadDoc({ version: 1, sheets: [{ id: "a", name: "A", cols: 26, rows: 100, cells: {}, freeze: { rows: 2, cols: 0 } }] });
    expect(cell("D2")!.classList.contains("dkg-frozen-b")).toBe(true);
    expect(freezeOf()).toEqual({ rows: 2, cols: 0 });
  });
});
