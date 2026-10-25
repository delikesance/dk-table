// @vitest-environment jsdom
/** Menus, mise en forme et insertion d'un document dans l'application montée. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount, type App } from "./app";
import { waitFor } from "../test-wait";

let app: App;
let root: HTMLElement;
const triggers = () => [...root.querySelectorAll(".dk-menubar .dk-menu__trigger")].map((t) => t.textContent);

// jsdom has no layout: CodeMirror's scroll-into-view needs client rects
for (const proto of [Element.prototype, Range.prototype]) Object.assign(proto, { getClientRects: () => [], getBoundingClientRect: () => ({ top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 }) });

beforeEach(async () => {
  localStorage.clear();
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app")!;
  app = mount(root);
  app.edit("A1", "Nom"); app.edit("B1", "CA"); app.edit("A2", "Bob"); app.edit("B2", "40");
});
async function openDoc(): Promise<void> {
  app.addDoc();
  await waitFor(() => expect(app.docEditor()).toBeDefined());
}

describe("barre de menus selon le mode", () => {
  it("bascule Feuille/Données <-> Insertion en entrant et en sortant du document", async () => {
    expect(triggers()).toContain("Feuille");
    await openDoc();
    expect(triggers()).toContain("Insertion");
    expect(triggers()).not.toContain("Feuille");
    app.switchSheet(app.sheets()[0].id);
    expect(triggers()).toContain("Données");
    expect(triggers()).not.toContain("Insertion");
  });
});

describe("mise en forme du document", () => {
  it("Gras / Titre 2 / liste appliqués à la sélection (syntaxe Markdown)", async () => {
    await openDoc();
    const ed = app.docEditor()!, text = () => ed.view.state.doc.toString();
    ed.view.dispatch({ changes: { from: 0, insert: "Bonjour" } });
    app.docFormat("h2");
    expect(text()).toBe("## Bonjour");
    ed.view.dispatch({ selection: { anchor: 3, head: 10 } });
    app.docFormat("strong");
    expect(text()).toBe("## **Bonjour**");
    app.docFormat("p"); app.docFormat("bullet");
    expect(text()).toBe("- **Bonjour**");
  });
});

describe("insertion dans le document", () => {
  it("tableau lié : la sélection de la feuille, sinon la zone utilisée", async () => {
    await openDoc();
    app.docInsert("table");
    const t = app.docEditor()!.view.state.doc.toString();
    expect(t).toContain("```dkblock");
    expect(JSON.parse(t.split("\n")[1])).toMatchObject({ ref: "A1:B2", kind: "table", sheet: "Feuille 1" });
  });
  it("barres et tendance : forme choisie", async () => {
    await openDoc();
    app.docInsert("bar");
    expect(JSON.parse(app.docEditor()!.view.state.doc.toString().split("\n")[1]).kind).toBe("bar");
  });
  it("cellule liée : insère @ pour ouvrir la recherche par noms", async () => {
    await openDoc();
    app.docInsert("cell");
    expect(app.docEditor()!.view.state.doc.toString()).toBe("@");
  });
  it("calcul : insère une puce vide, curseur dedans (source visible)", async () => {
    await openDoc();
    app.docInsert("calc");
    const v = app.docEditor()!.view;
    expect(v.state.doc.toString()).toBe("{{=}}");
    expect(v.state.selection.main.head).toBe(3);
  });
});
