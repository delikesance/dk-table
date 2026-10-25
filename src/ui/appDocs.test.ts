// @vitest-environment jsdom
/** dk doc inside the app: tabs, switching between grid and document, persistence in the workbook. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount, type App } from "./app";
import { waitFor } from "../test-wait";

/** Insert text at the start of the active document, through the editor view. */
function type_(a: App, text: string): void {
  const v = a.docEditor()!.view;
  v.dispatch({ changes: { from: 0, insert: text } });
}

let app: App;
let root: HTMLElement;
const tabs = () => [...root.querySelectorAll<HTMLElement>(".dk-tab:not(.dk-tab--add)")];
const docHost = () => root.querySelector<HTMLElement>(".dk-app__doc")!;
const gridHost = () => root.querySelector<HTMLElement>(".dk-app__grid")!;

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app")!;
  app = mount(root);
});

describe("documents dans le classeur", () => {
  it("crée un document : onglet à la suite des feuilles, éditeur visible, grille masquée", async () => {
    const id = app.addDoc();
    expect(tabs().map((t) => t.textContent)).toEqual(["Feuille 1", "Document 1"]);
    expect(tabs()[1].classList.contains("dk-tab--doc")).toBe(true);
    expect(tabs()[1].classList.contains("dk-tab--active")).toBe(true);
    expect(app.activeDocId()).toBe(id);
    expect(docHost().hidden).toBe(false);
    expect(gridHost().hidden).toBe(true);
    await waitFor(() => expect(docHost().querySelector(".cm-editor")).not.toBeNull());
  });
  it("revient à la grille en cliquant une feuille", () => {
    app.addDoc();
    tabs()[0].click();
    expect(app.activeDocId()).toBeUndefined();
    expect(docHost().hidden).toBe(true);
    expect(gridHost().hidden).toBe(false);
  });
  it("persiste le document avec le classeur et le rouvre", async () => {
    const id = app.addDoc();
    await waitFor(() => expect(app.docEditor()).toBeDefined());
    type_(app, "Rapport");
    const saved = app.toDoc();
    expect(saved.docs).toHaveLength(1);
    expect(saved.docs![0].md).toContain("Rapport");
    app.loadDoc({ version: 1, sheets: saved.sheets, active: saved.active });
    expect(app.toDoc().docs).toBeUndefined();
    expect(tabs()).toHaveLength(1);
    app.loadDoc(saved);
    expect(tabs().map((t) => t.textContent)).toEqual(["Feuille 1", "Document 1"]);
    await app.openDoc(id);
    expect(docHost().textContent).toContain("Rapport");
  });
  it("marque le classeur modifié à la création et à la saisie", async () => {
    app.markSaved();
    app.addDoc();
    await waitFor(() => expect(app.docEditor()).toBeDefined());
    expect(app.dirty).toBe(true);
    app.markSaved();
    type_(app, "x");
    expect(app.dirty).toBe(true);
  });
  it("supprime un document et revient à la grille", () => {
    const id = app.addDoc();
    app.removeDoc(id);
    expect(tabs().map((t) => t.textContent)).toEqual(["Feuille 1"]);
    expect(app.activeDocId()).toBeUndefined();
    expect(gridHost().hidden).toBe(false);
  });
});

describe("commande palette", () => {
  it("« Nouveau document » crée et ouvre un document", async () => {
    const { defaultRegistry } = await import("./palette/registry");
    const cmd = defaultRegistry.list().find((x) => x.id === "doc.new");
    expect(cmd?.label).toBe("Nouveau document");
    cmd!.run();
    expect(app.activeDocId()).toBeDefined();
  });
});
