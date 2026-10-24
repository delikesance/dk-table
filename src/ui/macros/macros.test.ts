// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount, type App } from "../app";
import { defaultRegistry } from "../palette/registry";

let app: App;
let root: HTMLElement;
const cell = (k: string) => root.querySelector<HTMLElement>(`.dkg-cell[data-key="${k}"]`)!;
const panel = () => root.querySelector<HTMLElement>(".dk-macros")!;

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app")!;
  app = mount(root);
});

describe("macros in the app", () => {
  it("runs a macro on the active sheet as a single undo step", async () => {
    app.edit("A1", "1");
    const m = app.macros.create();
    app.macros.update(m.id, { code: 'for i = 1, 3 do sheet.setCell("B" .. i, sheet.getValue("A1") + i) end' });
    const r = await app.runMacro(m.id);
    expect(r.ok).toBe(true);
    expect(cell("B3").textContent).toBe("4");
    app.undo();
    expect(cell("B1").textContent).toBe("");
    expect(cell("A1").textContent).toBe("1");
  });

  it("does not record an undo step when the macro changes nothing", async () => {
    app.edit("A1", "1");
    const m = app.macros.create();
    app.macros.update(m.id, { code: "print(1)" });
    await app.runMacro(m.id);
    app.undo();
    expect(cell("A1").textContent).toBe("");
  });

  it("persists macros in the document", async () => {
    const m = app.macros.create();
    app.macros.update(m.id, { code: "print(1)", name: "Totaux" });
    const doc = app.toDoc();
    expect(doc.macros).toEqual([{ id: m.id, name: "Totaux", code: "print(1)" }]);
    app.loadDoc({ ...doc, macros: [] });
    expect(app.macros.list()).toEqual([]);
    app.loadDoc(doc);
    expect(app.macros.list()[0].name).toBe("Totaux");
  });

  it("registers one palette command per macro, plus the editor command", async () => {
    const ids = () => defaultRegistry.list().map((c) => c.label);
    const m = app.macros.create();
    app.macros.update(m.id, { name: "Nettoyer", code: 'sheet.setCell("C1", "ok")' });
    expect(ids()).toContain("Éditeur de macros");
    const cmd = defaultRegistry.list().find((c) => c.label === "Macro : Nettoyer")!;
    cmd.run();
    await vi.waitFor(() => expect(cell("C1").textContent).toBe("ok"));
    expect(cell("C1").textContent).toBe("ok");
    app.macros.remove(m.id);
    expect(ids()).not.toContain("Macro : Nettoyer");
  });

  it("opens the panel with a macro ready, runs it and shows the output", async () => {
    expect(root.querySelector(".dk-macros")).toBeNull();
    await app.openMacros();
    expect(panel().hidden).toBe(false);
    expect(app.macros.list()).toHaveLength(1);
    const id = app.macros.list()[0].id;
    app.macros.update(id, { code: 'print("salut")' });
    panel().querySelector<HTMLButtonElement>(".dk-macros__run")!.click();
    expect(panel().querySelector(".dk-macros__out")!.textContent).toBe("salut");
  });

  it("shows errors in the output line", async () => {
    await app.openMacros();
    const id = app.macros.list()[0].id;
    app.macros.update(id, { code: "error('x')" });
    panel().querySelector<HTMLButtonElement>(".dk-macros__run")!.click();
    const out = panel().querySelector<HTMLElement>(".dk-macros__out")!;
    expect(out.textContent).toBe("Ligne 1 : x");
    expect(out.classList.contains("dk-macros__out--error")).toBe(true);
  });

  it("lists macros and switches the edited one on click", async () => {
    const a = app.macros.create(), b = app.macros.create();
    app.macros.update(b.id, { code: "print(2)" });
    await app.openMacros(a.id);
    const items = [...panel().querySelectorAll<HTMLElement>(".dk-macros__item")];
    expect(items.map((i) => i.textContent)).toEqual(["Macro 1", "Macro 2"]);
    items[1].click();
    expect(panel().querySelector(".dk-macros__item--active")!.textContent).toBe("Macro 2");
    expect(panel().querySelector(".cm-content")!.textContent).toBe("print(2)");
  });

  it("leaves Ctrl+Z/B/I to the code editor instead of the grid", async () => {
    app.edit("A1", "1");
    await app.openMacros();
    const content = panel().querySelector<HTMLElement>(".cm-content")!;
    content.dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true, bubbles: true }));
    expect(cell("A1").textContent).toBe("1");
  });
});
