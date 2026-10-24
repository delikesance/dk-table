// @vitest-environment jsdom
/** Integration: Ctrl+Z/Y ignored while editing a cell; "Nouveau" confirms before discarding unsaved changes. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount, type App } from "./app";
import { setConfirm } from "./fileops";

let app: App;
const ctrl = (key: string, target: EventTarget = document.body) =>
  target.dispatchEvent(new KeyboardEvent("keydown", { key, ctrlKey: true, bubbles: true, cancelable: true }));

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  app = mount(document.getElementById("app")!);
});

describe("shortcuts while editing", () => {
  it("Ctrl+Z / Ctrl+Y from the cell editor do not trigger global undo/redo", () => {
    const undo = vi.spyOn(app, "undo"), redo = vi.spyOn(app, "redo");
    const input = document.createElement("input");
    input.className = "dkg-editor";
    document.body.append(input);
    ctrl("z", input); ctrl("y", input);
    expect(undo).not.toHaveBeenCalled();
    expect(redo).not.toHaveBeenCalled();
    ctrl("z");
    expect(undo).toHaveBeenCalledTimes(1);
  });
});

describe("Nouveau (Ctrl+N)", () => {
  it("asks confirmation when dirty and keeps the document on refusal", () => {
    app.edit("A1", "42");
    const ask = vi.fn(() => false);
    setConfirm(ask);
    ctrl("n");
    expect(ask).toHaveBeenCalled();
    expect(app.toDoc().sheets[0].cells.A1?.raw).toBe("42");
  });
  it("resets to an empty document when the user agrees", () => {
    app.edit("A1", "42");
    setConfirm(() => true);
    ctrl("n");
    expect(app.toDoc().sheets).toHaveLength(1);
    expect(app.toDoc().sheets[0].cells.A1).toBeUndefined();
    expect(app.dirty).toBe(false);
  });
  it("does not ask when the document is clean", () => {
    const ask = vi.fn(() => false);
    setConfirm(ask);
    ctrl("n");
    expect(ask).not.toHaveBeenCalled();
  });
});
