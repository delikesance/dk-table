// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { createSheet, setCell } from "../engine/sheet";
import { createDocEditor, type DocEditor } from "./editor";
import type { RefBook } from "./refs";

function book(): RefBook {
  const s = createSheet();
  [["Commercial", "CA_T1", "Objectif"], ["Alice", "39500", "40000"], ["Bob", "40000", "35000"]]
    .forEach((r, i) => r.forEach((v, j) => setCell(s, "ABC"[j] + (i + 1), v)));
  return { sheets: () => [{ id: "s1", name: "Synthese", sheet: s, styles: {} }] };
}
const calc = (src: string, fmt = "auto") => ({ type: "calc", attrs: { src, fmt } });
const docOf = (...inline: object[]) => ({ type: "doc" as const, content: [{ type: "paragraph", content: [{ type: "text", text: "Soit " }, ...inline] }] });
let host: HTMLElement;
function mount(content: { type: "doc"; content: object[] }, b = book()): { ed: DocEditor; b: RefBook } {
  host = document.body.appendChild(document.createElement("div"));
  return { ed: createDocEditor(host, content, () => {}, { book: b, open: () => {} }), b };
}
const chip = () => host.querySelector<HTMLElement>(".dk-calc")!;
const input = () => host.querySelector<HTMLInputElement>(".dk-calc input")!;
const key = (el: Element, k: string) => el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));
const type = (el: HTMLInputElement, v: string) => { el.value = v; el.setSelectionRange(v.length, v.length); el.dispatchEvent(new Event("input", { bubbles: true })); };
afterEach(() => { document.body.innerHTML = ""; });

describe("puce de calcul", () => {
  it("affiche le résultat formaté", () => {
    mount(docOf(calc("{s1}!B3/{s1}!C3", "percent")));
    expect(chip().textContent).toContain("114");
    expect(chip().textContent).toContain("%");
  });
  it("suit la feuille après refresh", () => {
    const { ed, b } = mount(docOf(calc("{s1}!B3*2")));
    expect(chip().textContent).toBe("80000");
    setCell(b.sheets()[0].sheet, "B3", "1");
    ed.refresh();
    expect(chip().textContent).toBe("2");
  });
  it("erreur : puce d'erreur, texte autour intact", () => {
    mount(docOf(calc("1/0")));
    expect(chip().classList.contains("dk-calc--err")).toBe(true);
    expect(chip().textContent).toBe("#DIV/0!");
    expect(host.textContent).toContain("Soit");
  });
  it("une formule SPARKLINE/BAR/TREND affiche un mini-graphique en ligne", () => {
    mount(docOf(calc("BAR({s1}!B2:B3)")));
    expect(chip().querySelector("svg")).not.toBeNull();
  });
  it("la carte au survol montre la formule avec les noms de feuille et la valeur", () => {
    mount(docOf(calc("{s1}!B3/{s1}!C3")));
    chip().dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    const card = document.querySelector(".dk-refcard")!;
    expect(card.textContent).toContain("=Synthese!B3/Synthese!C3");
    chip().dispatchEvent(new MouseEvent("mouseout", { bubbles: true }));
    expect(document.querySelector(".dk-refcard")).toBeNull();
  });
});

describe("édition de la puce", () => {
  it("un clic ouvre le champ avec la formule sous sa forme tapée ; Entrée valide", () => {
    const { ed } = mount(docOf(calc("{s1}!B3")));
    chip().click();
    expect(input().value).toBe("=Synthese!B3");
    type(input(), "=Synthese!B3*2");
    key(input(), "Enter");
    expect(ed.view.state.doc.firstChild!.child(1).attrs.src).toBe("{s1}!B3*2");
    expect(input()).toBeNull();
    expect(chip().textContent).toBe("80000");
  });
  it("le format se choisit à côté du champ", () => {
    const { ed } = mount(docOf(calc("{s1}!B3/{s1}!C3")));
    chip().click();
    const sel = host.querySelector<HTMLSelectElement>(".dk-calc select")!;
    sel.value = "percent";
    sel.dispatchEvent(new Event("change", { bubbles: true }));
    key(input(), "Enter");
    expect(ed.view.state.doc.firstChild!.child(1).attrs.fmt).toBe("percent");
  });
  it("Échap garde le texte tapé comme texte, avec son =", () => {
    const { ed } = mount(docOf(calc("{s1}!B3")));
    chip().click();
    type(input(), "=2+2 vaut quatre");
    key(input(), "Escape");
    expect(ed.view.state.doc.firstChild!.textContent).toBe("Soit =2+2 vaut quatre");
  });
  it("une formule vide redevient un simple =", () => {
    const { ed } = mount(docOf(calc("")));
    expect(input()).not.toBeNull();
    key(input(), "Enter");
    expect(ed.view.state.doc.firstChild!.textContent).toBe("Soit =");
  });
});

describe("déclencheur =", () => {
  const press = (ed: DocEditor, from: number) => ed.view.someProp("handleTextInput", (f) => f(ed.view, from, from, "=", () => ed.view.state.tr));
  it("= après une espace ouvre une puce en édition", () => {
    const { ed } = mount(docOf());
    expect(press(ed, 6)).toBe(true);
    expect(ed.view.state.doc.firstChild!.child(1).type.name).toBe("calc");
    expect(input()).not.toBeNull();
  });
  it("= collé à un mot reste un caractère normal", () => {
    const { ed } = mount({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "a" }] }] });
    expect(press(ed, 2)).toBeFalsy();
  });
  it("= en début de paragraphe ouvre aussi une puce", () => {
    const { ed } = mount({ type: "doc", content: [{ type: "paragraph" }] });
    expect(press(ed, 1)).toBe(true);
  });
});

describe("@ dans la formule", () => {
  it("cherche une case par ses noms et insère son adresse", () => {
    mount(docOf(calc("")));
    type(input(), "=@bob c");
    expect(document.querySelector(".dk-mention")).not.toBeNull();
    key(input(), "Enter");
    expect(input().value).toBe("=Synthese!B3");
  });
  it("les fonctions se complètent comme dans une cellule", () => {
    mount(docOf(calc("")));
    type(input(), "=SU");
    expect(document.querySelector(".dk-fnpop")).not.toBeNull();
  });
});
