// @vitest-environment jsdom
/** App-level underline (Ctrl+U), wrap and borders: commands, undo/redo, .dktable round trip, toolbar. */
import { beforeEach, describe, expect, it } from "vitest";
import { mount, type App } from "./app";
import { defaultRegistry } from "./palette/registry";
import { parse, serialize } from "../io/format";

let app: App;
let root: HTMLElement;
const cell = (k: string) => root.querySelector<HTMLElement>(`.dkg-cell[data-key="${k}"]`)!;
const run = (id: string) => defaultRegistry.list().find((c) => c.id === id)!.run();
const ctrl = (k: string, target: EventTarget = document) => {
  const e = new KeyboardEvent("keydown", { key: k, ctrlKey: true, bubbles: true, cancelable: true });
  target.dispatchEvent(e);
  return e;
};
const btn = (a: string) => root.querySelector<HTMLButtonElement>(`[data-action="${a}"]`)!;

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app")!;
  app = mount(root);
});

describe("underline", () => {
  it("Ctrl+U toggles underline and is undoable", () => {
    app.select("A1");
    expect(ctrl("u").defaultPrevented).toBe(true);
    expect(app.activeStyle().underline).toBe(true);
    expect(cell("A1").style.textDecoration).toBe("underline");
    ctrl("u");
    expect(app.activeStyle().underline).toBe(false);
    app.undo();
    expect(app.activeStyle().underline).toBe(true);
    app.redo();
    expect(app.activeStyle().underline).toBe(false);
  });
  it("Ctrl+U is left to text fields", () => {
    const input = document.body.appendChild(document.createElement("input"));
    ctrl("u", input);
    expect(app.activeStyle().underline).toBeUndefined();
  });
  it("palette « Souligné » and the toolbar button toggle it", () => {
    run("format.underline");
    expect(app.activeStyle().underline).toBe(true);
    btn("underline").click();
    expect(app.activeStyle().underline).toBe(false);
    expect(btn("underline").getAttribute("aria-pressed")).toBe("false");
  });
});

describe("wrap", () => {
  it("palette command and toolbar toggle wrap, undoable", () => {
    run("format.wrap");
    expect(app.activeStyle().wrap).toBe(true);
    expect(cell("A1").classList.contains("dk-wrap")).toBe(true);
    expect(btn("wrap").getAttribute("aria-pressed")).toBe("true");
    btn("wrap").click();
    expect(app.activeStyle().wrap).toBe(false);
    app.undo();
    expect(app.activeStyle().wrap).toBe(true);
  });
});

describe("borders", () => {
  it("outer draws the rectangle's perimeter in one undo step", () => {
    app.select("A1:B2");
    app.borders("outer");
    expect(cell("A1").dataset.borders).toBe("tl");
    expect(cell("B2").dataset.borders).toBe("rb");
    app.undo();
    expect(cell("A1").hasAttribute("data-borders")).toBe(false);
    app.redo();
    expect(cell("B1").dataset.borders).toBe("tr");
  });
  it("palette commands apply each mode", () => {
    app.select("A1:B1");
    run("format.borders-all");
    expect(cell("B1").dataset.borders).toBe("trbl");
    run("format.borders-none");
    expect(cell("B1").hasAttribute("data-borders")).toBe(false);
    run("format.borders-bottom");
    expect(cell("A1").dataset.borders).toBe("b");
  });
  it("toolbar « Bordures » menu applies a mode and closes", () => {
    app.select("A1");
    btn("borders").click();
    const items = [...root.querySelectorAll<HTMLButtonElement>(".dk-borders [role=menuitem]")];
    expect(items.map((i) => i.textContent?.trim())).toEqual(["Toutes", "Contour", "Bas", "Aucune"]);
    items[0].click();
    expect(cell("A1").dataset.borders).toBe("trbl");
    expect(root.querySelector<HTMLElement>(".dk-borders [role=menu]")!.hidden).toBe(true);
  });
});

describe("persistence", () => {
  it("underline, wrap and borders survive a .dktable round trip", () => {
    app.select("A1:B2");
    app.borders("outer");
    app.style({ underline: true, wrap: true });
    const doc = parse(serialize(app.toDoc()));
    app.loadDoc(doc);
    app.select("A1");
    expect(app.activeStyle()).toEqual({ underline: true, wrap: true, borders: { t: true, l: true } });
    expect(cell("B2").dataset.borders).toBe("rb");
    expect(cell("A1").style.textDecoration).toBe("underline");
  });
});
