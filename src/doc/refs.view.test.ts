// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createSheet, setCell } from "../engine/sheet";
import { createDocEditor } from "./editor";
import type { RefBook } from "./refs";

function book(): RefBook {
  const s = createSheet();
  [["Commercial", "CA_T1"], ["Alice", "39500"], ["Bob", "40000"]].forEach((r, i) => r.forEach((v, j) => setCell(s, "AB"[j] + (i + 1), v)));
  return { sheets: () => [{ id: "s1", name: "Synthese", sheet: s, styles: {} }] };
}
const withRef = (sheet = "s1", ref = "B3") => ({
  type: "doc" as const,
  content: [{ type: "paragraph", content: [
    { type: "text", text: "Bob a réalisé " }, { type: "cellRef", attrs: { sheet, ref } }, { type: "text", text: " de CA." },
  ] }],
});
const chip = (host: HTMLElement) => host.querySelector<HTMLElement>(".dk-ref")!;
afterEach(() => { document.body.innerHTML = ""; });

describe("puces de référence vivantes", () => {
  it("affiche la valeur citée", () => {
    const host = document.body.appendChild(document.createElement("div"));
    createDocEditor(host, withRef(), () => {}, { book: book(), open: () => {} });
    expect(chip(host).textContent).toBe("40000");
    expect(chip(host).classList.contains("dk-ref--err")).toBe(false);
  });
  it("se met à jour quand la feuille change (refresh)", () => {
    const b = book();
    const host = document.body.appendChild(document.createElement("div"));
    const ed = createDocEditor(host, withRef(), () => {}, { book: b, open: () => {} });
    setCell(b.sheets()[0].sheet, "B3", "70000");
    ed.refresh();
    expect(chip(host).textContent).toBe("70000");
  });
  it("affiche #REF! quand la cible n'existe plus, sans toucher au texte autour", () => {
    const host = document.body.appendChild(document.createElement("div"));
    createDocEditor(host, withRef("gone"), () => {}, { book: book(), open: () => {} });
    expect(chip(host).textContent).toBe("#REF!");
    expect(chip(host).classList.contains("dk-ref--err")).toBe(true);
    expect(host.textContent).toContain("Bob a réalisé");
  });
  it("ouvre la cellule au clic", () => {
    const open = vi.fn();
    const host = document.body.appendChild(document.createElement("div"));
    createDocEditor(host, withRef(), () => {}, { book: book(), open });
    chip(host).click();
    expect(open).toHaveBeenCalledWith({ sheet: "s1", ref: "B3" });
  });
  it("montre une carte au survol : adresse, valeur ; la retire à la sortie", () => {
    const host = document.body.appendChild(document.createElement("div"));
    createDocEditor(host, withRef(), () => {}, { book: book(), open: () => {} });
    chip(host).dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    const card = document.querySelector(".dk-refcard")!;
    expect(card.textContent).toContain("Synthese!B3");
    expect(card.textContent).toContain("40000");
    chip(host).dispatchEvent(new MouseEvent("mouseout", { bubbles: true }));
    expect(document.querySelector(".dk-refcard")).toBeNull();
  });
});

describe("mention avec @", () => {
  /** Type `text` at the end of the empty document, then press `key` through the editor. */
  function setup() {
    const host = document.body.appendChild(document.createElement("div"));
    const cb = vi.fn();
    const ed = createDocEditor(host, { type: "doc", content: [{ type: "paragraph" }] }, cb, { book: book(), open: () => {} });
    const press = (key: string) => ed.view.someProp("handleKeyDown", (f) => f(ed.view, new KeyboardEvent("keydown", { key })));
    const type = (t: string) => ed.view.dispatch(ed.view.state.tr.insertText(t));
    return { ed, host, press, type, cb };
  }
  it("propose les cases trouvées par leurs noms", () => {
    const { type } = setup();
    type("@bob ca");
    const items = [...document.querySelectorAll(".dk-mention li")].map((li) => li.textContent);
    expect(items[0]).toContain("Bob · CA_T1");
    expect(items[0]).toContain("Synthese!B3");
  });
  it("Entrée remplace @requête par une puce vivante", () => {
    const { ed, press, type } = setup();
    type("Total @bob ca");
    expect(press("Enter")).toBe(true);
    const json = JSON.stringify(ed.view.state.doc.toJSON());
    expect(json).toContain('"type":"cellRef"');
    expect(json).toContain('"ref":"B3"');
    expect(ed.view.state.doc.textContent).toBe("Total ");
    expect(document.querySelector(".dk-mention")).toBeNull();
  });
  it("Échap ferme la liste sans modifier le texte", () => {
    const { ed, press, type } = setup();
    type("@bob");
    expect(press("Escape")).toBe(true);
    expect(document.querySelector(".dk-mention")).toBeNull();
    expect(ed.view.state.doc.textContent).toBe("@bob");
  });
  it("n'ouvre rien sans correspondance", () => {
    const { type, press } = setup();
    type("@zzzz");
    expect(document.querySelector(".dk-mention")).toBeNull();
    expect(press("ArrowDown")).toBeFalsy();
  });
});
