// @vitest-environment jsdom
/** Vue scindée : feuille à gauche, document à droite (Ctrl+\). */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount, type App } from "./app";

let app: App;
let root: HTMLElement;
const grid = () => root.querySelector<HTMLElement>(".dk-app__grid")!;
const doc = () => root.querySelector<HTMLElement>(".dk-app__doc")!;

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app")!;
  app = mount(root);
  app.edit("B2", "40");
});
async function openDoc(): Promise<void> {
  app.addDoc();
  await vi.waitFor(() => expect(app.docEditor()).toBeDefined());
}

describe("barre flottante de la grille", () => {
  it("n'apparaît pas par-dessus le document", async () => {
    app.select("A1:B2");
    expect(root.querySelector<HTMLElement>(".dk-floating")!.hidden).toBe(false);
    await openDoc();
    expect(root.querySelector<HTMLElement>(".dk-floating")!.hidden).toBe(true);
  });
});

describe("vue scindée", () => {
  it("bascule entre le document seul et feuille + document", async () => {
    await openDoc();
    expect(grid().hidden).toBe(true);
    app.toggleSplit();
    expect(grid().hidden).toBe(false);
    expect(doc().hidden).toBe(false);
    expect(root.querySelector(".dk-app__main--split")).not.toBeNull();
    app.toggleSplit();
    expect(grid().hidden).toBe(true);
  });
  it("sans document ouvert, ouvre le premier en vue scindée (ou en crée un)", async () => {
    app.toggleSplit();
    await vi.waitFor(() => expect(app.docEditor()).toBeDefined());
    expect(grid().hidden).toBe(false);
    expect(doc().hidden).toBe(false);
  });
  it("Ctrl+\\ déclenche la bascule", async () => {
    await openDoc();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "\\", ctrlKey: true, bubbles: true }));
    expect(grid().hidden).toBe(false);
  });
  it("un clic sur un onglet de feuille garde le document ouvert à côté", async () => {
    app.addSheet();
    await openDoc();
    app.toggleSplit();
    app.switchSheet(app.sheets()[1].id);
    expect(app.docEditor()).toBeDefined();
    expect(grid().hidden).toBe(false);
  });
  it("une puce citée ouvre la cellule sans quitter le document", async () => {
    await openDoc();
    app.toggleSplit();
    const v = app.docEditor()!.view;
    v.dispatch({ changes: { from: 0, insert: "{{@Feuille 1!B2}}" } });
    root.querySelector<HTMLElement>(".dk-ref")!.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
    expect(app.selection()).toBe("B2");
    expect(app.activeDocId()).toBeDefined();
  });
  it("fermer le document remet la grille seule", async () => {
    await openDoc();
    app.toggleSplit();
    app.switchSheet(app.sheets()[0].id);
    app.removeDoc(app.activeDocId()!);
    expect(grid().hidden).toBe(false);
    expect(root.querySelector(".dk-app__main--split")).toBeNull();
  });
});
