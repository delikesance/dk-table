// @vitest-environment jsdom
/** Insert/delete rows/cols from the context menu, the palette and the Ctrl+Maj+= / Ctrl+- shortcuts. */
import { beforeEach, describe, expect, it } from "vitest";
import { mount, type App } from "./app";
import { defaultRegistry } from "./palette/registry";

let app: App;
let root: HTMLElement;
const raw = (k: string) => app.toDoc().sheets[0].cells[k]?.raw;
const cell = (k: string) => root.querySelector<HTMLElement>(`.dkg-cell[data-key="${k}"]`)!;
const key = (k: string, extra: KeyboardEventInit = {}) =>
  document.dispatchEvent(new KeyboardEvent("keydown", { key: k, ctrlKey: true, bubbles: true, cancelable: true, ...extra }));
const LABELS = ["Insérer une ligne au-dessus", "Insérer une colonne à gauche", "Supprimer les lignes", "Supprimer les colonnes"];

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app")!;
  app = mount(root);
  app.editMany({ A1: "1", A2: "2" });
  app.select("A2");
});

describe("context menu", () => {
  it("lists the four entries and inserts a row", () => {
    cell("A2").dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
    const items = [...document.querySelectorAll<HTMLElement>(".dk-menu__item")];
    const labels = items.map((i) => i.textContent ?? "");
    for (const l of LABELS) expect(labels.some((t) => t.startsWith(l))).toBe(true);
    items.find((i) => i.textContent?.startsWith(LABELS[0]))!.click();
    expect(raw("A3")).toBe("2");
  });
});

describe("palette", () => {
  it("registers commands with the same labels", () => {
    const list = defaultRegistry.list().map((c) => c.label);
    for (const l of LABELS) expect(list).toContain(l);
    defaultRegistry.list().find((c) => c.label === LABELS[2])!.run();
    expect(raw("A2")).toBeUndefined();
  });
});

describe("shortcuts", () => {
  it("Ctrl+Maj+= inserts a row above, Ctrl+- deletes the selected rows", () => {
    key("+", { shiftKey: true });
    expect(raw("A3")).toBe("2");
    app.select("A3");
    key("-");
    expect(raw("A3")).toBeUndefined();
    expect(raw("A1")).toBe("1");
  });
});
