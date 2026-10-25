// @vitest-environment jsdom
/** Tests for the calc-mode UI: F9 / Maj+F9 recalc in manual mode and the Paramètres checkboxes. */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mount, type App } from "./app";
import { DEFAULT_CALC, calcMode, setCalcMode } from "../engine/calc-mode";
import { openSettings } from "./dialogs/settings";

let app: App;
let root: HTMLElement;
const grid = () => root.querySelector<HTMLElement>(".dkg")!;
const cell = (k: string) => root.querySelector(`.dkg-cell[data-key="${k}"]`)?.textContent ?? "";
const key = (el: Element, k: string, init: KeyboardEventInit = {}) =>
  el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true, ...init }));

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app")!;
  app = mount(root);
  app.edit("A1", "1");
  app.edit("B1", "=A1*2");
});

afterEach(() => setCalcMode(DEFAULT_CALC));

describe("calc mode UI", () => {
  it("F9 recalculates the workbook in manual mode, Maj+F9 only the active sheet", () => {
    setCalcMode({ manual: true });
    app.edit("A1", "5");
    expect(cell("B1")).toBe("2");
    key(grid(), "F9");
    expect(cell("B1")).toBe("10");
    app.edit("A1", "7");
    expect(cell("B1")).toBe("10");
    key(grid(), "F9", { shiftKey: true });
    expect(cell("B1")).toBe("14");
  });

  it("Paramètres: the manual checkbox switches the calc mode", () => {
    openSettings();
    const box = document.querySelector<HTMLInputElement>('input[name="manual"]')!;
    box.checked = true;
    box.dispatchEvent(new Event("change"));
    expect(calcMode().manual).toBe(true);
    const iter = document.querySelector<HTMLInputElement>('input[name="iterative"]')!;
    iter.checked = true;
    iter.dispatchEvent(new Event("change"));
    expect(calcMode().iterative).toBe(true);
  });
});
