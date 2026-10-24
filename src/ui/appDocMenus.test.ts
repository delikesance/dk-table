// @vitest-environment jsdom
/** Menus, mise en forme et insertion d'un document dans l'application montée. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount, type App } from "./app";

let app: App;
let root: HTMLElement;
const triggers = () => [...root.querySelectorAll(".dk-menubar .dk-menu__trigger")].map((t) => t.textContent);

// jsdom has no layout: ProseMirror's scroll-into-view needs client rects
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
  await vi.waitFor(() => expect(app.docEditor()).toBeDefined());
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
  it("Gras / Titre 2 / liste appliqués à la sélection", async () => {
    await openDoc();
    const ed = app.docEditor()!;
    ed.view.dispatch(ed.view.state.tr.insertText("Bonjour"));
    app.docFormat("h2");
    expect(ed.view.state.doc.firstChild!.type.name).toBe("heading");
    ed.view.dispatch(ed.view.state.tr.setSelection((ed.view.state.selection.constructor as any).create(ed.view.state.doc, 1, 8)));
    app.docFormat("strong");
    expect(ed.view.state.doc.firstChild!.firstChild!.marks[0].type.name).toBe("strong");
    app.docFormat("p"); app.docFormat("bullet");
    expect(ed.view.state.doc.firstChild!.type.name).toBe("bullet_list");
  });
});

describe("insertion dans le document", () => {
  it("tableau lié : la sélection de la feuille, sinon la zone utilisée", async () => {
    await openDoc();
    app.docInsert("table");
    const ed = app.docEditor()!;
    const b = ed.view.state.doc.firstChild!;
    expect(b.type.name).toBe("liveBlock");
    expect(b.attrs).toMatchObject({ ref: "A1:B2", kind: "table", sheet: app.sheets()[0].id });
  });
  it("barres et tendance : forme choisie", async () => {
    await openDoc();
    app.docInsert("bar");
    expect(app.docEditor()!.view.state.doc.firstChild!.attrs.kind).toBe("bar");
  });
  it("cellule liée : insère @ pour ouvrir la recherche par noms", async () => {
    await openDoc();
    app.docInsert("cell");
    expect(app.docEditor()!.view.state.doc.textContent).toBe("@");
  });
});
