// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { createMenus } from "./menus";

/** Builds the menus with spy handlers. */
function mk() {
  const h = { onNew: vi.fn(), onOpen: vi.fn(), onSave: vi.fn(), onSaveAs: vi.fn(), onImportCsv: vi.fn(), onExportCsv: vi.fn() };
  const el = createMenus(h);
  document.body.append(el);
  return { el, h };
}
const trig = (el: HTMLElement, name: string) =>
  [...el.querySelectorAll<HTMLButtonElement>(".dk-menu__trigger")].find((b) => b.textContent!.includes(name))!;
const item = (el: HTMLElement, name: string) =>
  [...el.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((b) => b.querySelector(".dk-menu__label")!.textContent === name)!;
const key = (t: HTMLElement, k: string) => t.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true }));

describe("toolbar menus", () => {
  it("opens File menu on click and calls onSave", () => {
    const { el, h } = mk();
    const t = trig(el, "Fichier");
    expect(t.getAttribute("aria-expanded")).toBe("false");
    t.click();
    expect(t.getAttribute("aria-expanded")).toBe("true");
    item(el, "Enregistrer").click();
    expect(h.onSave).toHaveBeenCalledTimes(1);
    expect(t.getAttribute("aria-expanded")).toBe("false");
  });
  it("wires new/open/save as", () => {
    const { el, h } = mk();
    for (const n of ["Nouveau", "Ouvrir", "Enregistrer sous"]) { trig(el, "Fichier").click(); item(el, n).click(); }
    expect(h.onNew).toHaveBeenCalled(); expect(h.onOpen).toHaveBeenCalled(); expect(h.onSaveAs).toHaveBeenCalled();
    expect(h.onSave).not.toHaveBeenCalled();
  });
  it("closes on Escape and refocuses trigger", () => {
    const { el } = mk();
    const t = trig(el, "Fichier"); t.click();
    key(item(el, "Nouveau"), "Escape");
    expect(t.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(t);
  });
  it("navigates with arrows and wraps", () => {
    const { el } = mk();
    trig(el, "Fichier").click();
    expect(document.activeElement).toBe(item(el, "Nouveau"));
    key(document.activeElement as HTMLElement, "ArrowDown");
    expect(document.activeElement).toBe(item(el, "Ouvrir"));
    key(document.activeElement as HTMLElement, "ArrowUp");
    key(document.activeElement as HTMLElement, "ArrowUp");
    expect(document.activeElement).toBe(item(el, "Enregistrer sous"));
  });
  it("Import/Export menu calls CSV handlers", () => {
    const { el, h } = mk();
    trig(el, "Import").click(); item(el, "Importer un CSV").click();
    trig(el, "Import").click(); item(el, "Exporter en CSV").click();
    expect(h.onImportCsv).toHaveBeenCalled(); expect(h.onExportCsv).toHaveBeenCalled();
  });
  it("opening one menu closes the other; outside click closes", () => {
    const { el } = mk();
    trig(el, "Fichier").click(); trig(el, "Import").click();
    expect(trig(el, "Fichier").getAttribute("aria-expanded")).toBe("false");
    document.body.click();
    expect(trig(el, "Import").getAttribute("aria-expanded")).toBe("false");
  });
});
