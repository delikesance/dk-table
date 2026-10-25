// @vitest-environment jsdom
/** App-level validation: paste, fill and open are checked like typing; panel data + « Corriger ». */
import { beforeEach, describe, expect, it } from "vitest";
import { mount, type App } from "./app";
import type { ValRule } from "../engine/validation/types";

let app: App;
let root: HTMLElement;
const cell = (k: string) => root.querySelector<HTMLElement>(`.dkg-cell[data-key="${k}"]`)!;
const rule: ValRule = { range: "A1:A9", type: "whole", min: 1, max: 10 };
const tick = () => new Promise<void>((r) => setTimeout(r, 0));

/** Paste `text` at the active cell through a clipboard-like event on the grid. */
function paste(text: string): void {
  const e = new Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(e, "clipboardData", { value: { getData: () => text, setData: () => {} } });
  root.querySelector(".dkg")!.dispatchEvent(e);
}

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app")!;
  app = mount(root);
  app.setValidationRules([rule]);
});

describe("validation in the app", () => {
  it("stores rules (copy) and lists invalid cells", () => {
    expect(app.validationRules()).toEqual([rule]);
    app.editMany({ A1: "5", A2: "50" });
    expect(app.invalidCells().map((i) => i.key)).toEqual(["A2"]);
  });
  it("paste cannot bypass the rule: invalid cells are marked and a toast offers to see them", async () => {
    app.select("A1");
    paste("3\n99\nabc");
    await tick();
    expect(app.invalidCells().map((i) => i.key)).toEqual(["A2", "A3"]);
    expect(cell("A2").dataset.inv).toBeDefined();
    expect(cell("A1").dataset.inv).toBeUndefined();
    expect(document.querySelector(".dk-toast__msg")?.textContent).toMatch(/2 cellules invalides/);
  });
  it("fill down is checked too", async () => {
    app.edit("A1", "99");
    app.select("A1:A3");
    root.querySelector(".dkg")!.dispatchEvent(new KeyboardEvent("keydown", { key: "d", ctrlKey: true, bubbles: true }));
    await tick();
    expect(app.invalidCells().map((i) => i.key)).toEqual(["A1", "A2", "A3"]);
    expect(document.querySelector(".dk-toast__msg")?.textContent).toMatch(/3 cellules invalides/);
  });
  it("fixInvalid clears the given cells in one undo step", () => {
    app.editMany({ A1: "5", A2: "50", A3: "x" });
    app.fixInvalid(["A2"]);
    expect(app.invalidCells().map((i) => i.key)).toEqual(["A3"]);
    app.fixInvalid();
    expect(app.invalidCells()).toEqual([]);
    expect(cell("A1").textContent).toBe("5");
    app.undo();
    expect(app.invalidCells().map((i) => i.key)).toEqual(["A3"]);
  });
  it("rules are persisted and checked when a document is loaded", async () => {
    app.editMany({ A1: "50" });
    const doc = app.toDoc();
    expect(doc.sheets[0].validation).toEqual([rule]);
    app.loadDoc(doc);
    await tick();
    expect(app.invalidCells().map((i) => i.key)).toEqual(["A1"]);
    expect(cell("A1").dataset.inv).toBeDefined();
  });
  it("rules changes are undoable", () => {
    app.setValidationRules([]);
    expect(app.validationRules()).toEqual([]);
    app.undo();
    expect(app.validationRules()).toEqual([rule]);
  });
});
