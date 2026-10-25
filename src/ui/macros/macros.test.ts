// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount, type App } from "../app";
import { defaultRegistry } from "../palette/registry";
import { waitFor } from "../../test-wait";

let app: App;
let root: HTMLElement;
const cell = (k: string) => root.querySelector<HTMLElement>(`.dkg-cell[data-key="${k}"]`)!;

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
    expect(ids()).toContain("Macros");
    const cmd = defaultRegistry.list().find((c) => c.label === "Macro : Nettoyer")!;
    cmd.run();
    await waitFor(() => expect(cell("C1").textContent).toBe("ok"));
    expect(cell("C1").textContent).toBe("ok");
    app.macros.remove(m.id);
    expect(ids()).not.toContain("Macro : Nettoyer");
  });

  it("leaves Ctrl+Z/B/I to the code editor instead of the grid", async () => {
    app.edit("A1", "1");
    const m = app.macros.create();
    await app.editMacro(m.id);
    await waitFor(() => expect(root.querySelector(".dk-mview .cm-content")).not.toBeNull());
    const content = root.querySelector<HTMLElement>(".dk-mview .cm-content")!;
    content.dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true, bubbles: true }));
    expect(cell("A1").textContent).toBe("1");
  });
});
