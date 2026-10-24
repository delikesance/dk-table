// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { mount, type App } from "./app";

let app: App;
let root: HTMLElement;
const grid = () => root.querySelector<HTMLElement>(".dkg")!;
const key = (el: Element, k: string, init: KeyboardEventInit = {}) =>
  el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true, ...init }));

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app")!;
  app = mount(root);
});

describe("app keyboard wiring", () => {
  it("Ctrl+PageDown / Ctrl+PageUp switch to the next / previous sheet, clamped", () => {
    app.addSheet();
    const [s1, s2] = app.sheets();
    const active = () => root.querySelector(".dk-tabs [aria-selected=true], .dk-tabs .is-active")?.textContent ?? "";
    app.switchSheet(s1.id);
    key(grid(), "PageDown", { ctrlKey: true });
    expect(active()).toContain(s2.name);
    key(grid(), "PageDown", { ctrlKey: true });
    expect(active()).toContain(s2.name);
    key(grid(), "PageUp", { ctrlKey: true });
    expect(active()).toContain(s1.name);
    expect(document.activeElement).toBe(grid());
  });
  it("Ctrl+Enter fills the selection as one undo step", async () => {
    app.select("A1:B2");
    key(grid(), "5");
    key(root.querySelector(".dkg-editor")!, "Enter", { ctrlKey: true });
    await Promise.resolve();
    expect(app.toDoc().sheets[0].cells).toEqual({ A1: { raw: "5" }, A2: { raw: "5" }, B1: { raw: "5" }, B2: { raw: "5" } });
    app.undo();
    expect(app.toDoc().sheets[0].cells).toEqual({});
  });
  it("F4 in the formula bar cycles the reference at the caret", () => {
    const fx = root.querySelector<HTMLInputElement>(".dk-formula__input")!;
    fx.value = "=B3*2";
    fx.setSelectionRange(3, 3);
    key(fx, "F4");
    expect(fx.value).toBe("=$B$3*2");
    expect(app.selection()).toBe("A1");
  });
});
