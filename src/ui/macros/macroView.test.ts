// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { vi } from "vitest";
import { mount, type App } from "../app";
import { waitFor } from "../../test-wait";

let app: App;
let root: HTMLElement;
const panel = () => root.querySelector<HTMLElement>(".dk-macros")!;
const view = () => root.querySelector<HTMLElement>(".dk-mview")!;
const tab = (id: string) => root.querySelector<HTMLElement>(`.dk-tab[data-id="${id}"]`);
const cell = (k: string) => root.querySelector<HTMLElement>(`.dkg-cell[data-key="${k}"]`)!;

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app")!;
  app = mount(root);
});

describe("macro list panel", () => {
  it("is a plain list: no code editor, one pencil and one run button per macro", async () => {
    const a = app.macros.create(), b = app.macros.create();
    await app.openMacros();
    expect(panel().querySelector(".cm-editor")).toBeNull();
    const rows = [...panel().querySelectorAll<HTMLElement>(".dk-macros__item")];
    expect(rows.map((r) => r.querySelector(".dk-macros__name")!.textContent)).toEqual(["Macro 1", "Macro 2"]);
    for (const r of rows) {
      expect(r.querySelector('[data-action="edit"]')).not.toBeNull();
      expect(r.querySelector('[data-action="run"]')).not.toBeNull();
    }
    expect([a.id, b.id]).toHaveLength(2);
  });

  it("runs a macro from its row and shows the output in the panel", async () => {
    const m = app.macros.create();
    app.macros.update(m.id, { code: 'print("salut")' });
    await app.openMacros();
    panel().querySelector<HTMLElement>('[data-action="run"]')!.click();
    expect(panel().querySelector(".dk-macros__out")!.textContent).toBe("salut");
  });
});

describe("macro editor tab", () => {
  it("opens full screen from the pencil, as a tab next to the sheets", async () => {
    const m = app.macros.create();
    app.macros.update(m.id, { code: "print(2)" });
    await app.openMacros();
    panel().querySelector<HTMLElement>('[data-action="edit"]')!.click();
    await waitFor(() => expect(view().querySelector(".cm-content")!.textContent).toBe("print(2)"));
    expect(tab(m.id)!.classList.contains("dk-tab--active")).toBe(true);
    expect(tab(m.id)!.classList.contains("dk-tab--macro")).toBe(true);
    expect(root.querySelector<HTMLElement>(".dk-app__grid")!.hidden).toBe(true);
    expect(view().hidden).toBe(false);
  });

  it("runs with the button and shows the result under the code", async () => {
    app.edit("A1", "1");
    const m = app.macros.create();
    app.macros.update(m.id, { code: 'sheet.setCell("B1", 5) print("ok")' });
    await app.editMacro(m.id);
    view().querySelector<HTMLElement>(".dk-mview__run")!.click();
    expect(view().querySelector(".dk-mview__out")!.textContent).toBe("ok");
    app.switchSheet(app.sheets()[0].id);
    expect(cell("B1").textContent).toBe("5");
  });

  it("shows errors with their line", async () => {
    const m = app.macros.create();
    app.macros.update(m.id, { code: "error('x')" });
    await app.editMacro(m.id);
    view().querySelector<HTMLElement>(".dk-mview__run")!.click();
    const out = view().querySelector<HTMLElement>(".dk-mview__out")!;
    expect(out.textContent).toBe("Ligne 1 : x");
    expect(out.classList.contains("dk-mview__out--error")).toBe(true);
  });

  it("goes back to the grid when a sheet tab is clicked and keeps its own tab", async () => {
    const m = app.macros.create();
    await app.editMacro(m.id);
    root.querySelector<HTMLElement>('.dk-tab:not(.dk-tab--macro):not(.dk-tab--add)')!.click();
    expect(root.querySelector<HTMLElement>(".dk-app__macro")!.hidden).toBe(true);
    expect(root.querySelector<HTMLElement>(".dk-app__grid")!.hidden).toBe(false);
    expect(tab(m.id)).not.toBeNull();
    tab(m.id)!.click();
    await waitFor(() => expect(view().hidden).toBe(false));
  });

  it("closes the tab (without deleting the macro) from its context menu / Delete key", async () => {
    const m = app.macros.create();
    await app.editMacro(m.id);
    tab(m.id)!.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete", bubbles: true }));
    expect(tab(m.id)).toBeNull();
    expect(app.macros.get(m.id)).toBeDefined();
    expect(root.querySelector<HTMLElement>(".dk-app__grid")!.hidden).toBe(false);
  });

  it("renames the macro from the tab", async () => {
    const m = app.macros.create();
    await app.editMacro(m.id);
    tab(m.id)!.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    const input = root.querySelector<HTMLInputElement>(".dk-tab__input")!;
    input.value = "Totaux";
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(app.macros.get(m.id)!.name).toBe("Totaux");
    expect(tab(m.id)!.textContent).toBe("Totaux");
  });

  it("closes the tab when the macro is deleted", async () => {
    const m = app.macros.create();
    await app.editMacro(m.id);
    app.macros.remove(m.id);
    expect(tab(m.id)).toBeNull();
    expect(root.querySelector<HTMLElement>(".dk-app__grid")!.hidden).toBe(false);
  });

  it("'+ Nouvelle' creates a macro and opens its editor", async () => {
    await app.openMacros();
    panel().querySelector<HTMLElement>(".dk-macros__new")!.click();
    await waitFor(() => expect(view().hidden).toBe(false));
    expect(app.macros.list()).toHaveLength(1);
  });
});
