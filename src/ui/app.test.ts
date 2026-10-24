// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { mount, type App } from "./app";

let app: App;
let root: HTMLElement;
const cell = (k: string) => root.querySelector<HTMLElement>(`.dkg-cell[data-key="${k}"]`)!;

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app")!;
  app = mount(root);
});

describe("app integration", () => {
  it("lays out toolbar, formula bar, grid, tabs, sidebar", () => {
    for (const s of [".dk-toolbar", ".dk-formula", ".dkg", ".dk-tabs", ".dk-sidebar"]) {
      expect(root.querySelector(s), s).not.toBeNull();
    }
  });

  it("menu bar (8 menus) heads the top bar and stays visible in minimal mode", () => {
    const bar = root.querySelector<HTMLElement>(".dk-app__top > .dk-app__menubar .dk-menubar")!;
    expect(bar.querySelectorAll(".dk-menu__trigger")).toHaveLength(8);
    expect(root.querySelector(".dk-app")!.classList.contains("dk-app--minimal")).toBe(true);
    expect(bar.closest("[hidden]")).toBeNull();
  });

  it("Ctrl+, opens Paramètres, Alt+F11 opens the macro editor", () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: ",", ctrlKey: true }));
    expect(document.querySelector('.dk-dialog[data-id="settings"]')).not.toBeNull();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "F11", altKey: true }));
    expect(document.querySelector(".dk-macro")).not.toBeNull();
  });

  it("recalculates dependents on edit", () => {
    app.edit("A1", "2");
    app.edit("B1", "3");
    app.edit("C1", "=A1+B1");
    expect(cell("C1").textContent).toBe("5");
    app.edit("A1", "10");
    expect(cell("C1").textContent).toBe("13");
  });

  it("renders SPARKLINE as svg in-cell", () => {
    ["1", "3", "2", "5", "4"].forEach((v, i) => app.edit(`A${i + 1}`, v));
    app.edit("B1", "=SPARKLINE(A1:A5)");
    expect(cell("B1").querySelector("svg")).not.toBeNull();
  });

  it("formula bar commit edits the active cell", () => {
    app.edit("A1", "4");
    const fx = root.querySelector<HTMLInputElement>(".dk-formula__input")!;
    app.select("B1");
    fx.value = "=A1*2";
    fx.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    expect(cell("B1").textContent).toBe("8");
  });

  it("undo and redo restore cells", () => {
    app.edit("A1", "1");
    app.edit("A1", "2");
    app.undo();
    expect(cell("A1").textContent).toBe("1");
    app.redo();
    expect(cell("A1").textContent).toBe("2");
  });

  it("keeps separate sheets", () => {
    app.edit("A1", "7");
    app.addSheet();
    expect(cell("A1").textContent).toBe("");
    app.switchSheet(app.sheets()[0].id);
    expect(cell("A1").textContent).toBe("7");
  });

  it("Ctrl+Z shortcut undoes", () => {
    app.edit("A1", "1");
    app.edit("A1", "9");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true }));
    expect(cell("A1").textContent).toBe("1");
  });

  it("serializes to a document and loads it back", () => {
    app.edit("A1", "5");
    app.edit("A2", "=A1*2");
    const doc = app.toDoc();
    app.loadDoc({ version: 1, sheets: [{ id: "x", name: "Z", cols: 26, rows: 100, cells: {} }] });
    expect(cell("A2").textContent).toBe("");
    app.loadDoc(doc);
    expect(cell("A2").textContent).toBe("10");
  });
});
