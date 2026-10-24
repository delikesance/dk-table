// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { createSheet, setCell } from "../engine/sheet";
import { createDocEditor, type DocEditor } from "./editor";
import type { RefBook } from "./refs";
import type { BlockAttrs } from "./blocks";

function book(): RefBook {
  const s = createSheet();
  [["Commercial", "CA_T1", "Atteinte"], ["Alice", "39500", "0.98"], ["Bob", "40000", "1.14"], ["Claire", "55000", "1.1"]]
    .forEach((r, i) => r.forEach((v, j) => setCell(s, "ABC"[j] + (i + 1), v)));
  return { sheets: () => [{ id: "s1", name: "Synthese", sheet: s, styles: {} }] };
}
const attrs = (o: Partial<BlockAttrs> = {}): BlockAttrs => ({ sheet: "s1", ref: "A1:C4", kind: "table", header: true, cols: null, value: null, ...o });
const docOf = (a: BlockAttrs) => ({ type: "doc" as const, content: [{ type: "liveBlock", attrs: a }, { type: "paragraph" }] });
let host: HTMLElement;
function mount(a: BlockAttrs, b = book()): { ed: DocEditor; b: RefBook } {
  host = document.body.appendChild(document.createElement("div"));
  return { ed: createDocEditor(host, docOf(a), () => {}, { book: b, open: () => {} }), b };
}
const blockAttrs = (ed: DocEditor) => ed.view.state.doc.firstChild!.attrs as BlockAttrs;
afterEach(() => { document.body.innerHTML = ""; });

describe("bloc lié : tableau", () => {
  it("affiche l'en-tête, les lignes et l'adresse liée", () => {
    mount(attrs());
    expect(host.querySelectorAll("th")).toHaveLength(3);
    expect(host.querySelectorAll("tbody tr")).toHaveLength(3);
    expect(host.querySelector(".dk-block__tag")!.textContent).toContain("Synthese!A1:C4");
  });
  it("sans en-tête, toutes les lignes sont du corps", () => {
    mount(attrs({ header: false }));
    expect(host.querySelectorAll("th")).toHaveLength(0);
    expect(host.querySelectorAll("tbody tr")).toHaveLength(4);
  });
  it("suit la feuille après refresh", () => {
    const { ed, b } = mount(attrs());
    setCell(b.sheets()[0].sheet, "B3", "70000");
    ed.refresh();
    expect(host.textContent).toContain("70000");
  });
  it("cible supprimée : message #REF!, le reste du document est intact", () => {
    mount(attrs({ sheet: "gone" }));
    expect(host.querySelector(".dk-block--err")!.textContent).toContain("#REF!");
  });
});

describe("bloc lié : formes", () => {
  it("barres : une barre par ligne, étiquette = 1re colonne, valeur = dernière colonne", () => {
    mount(attrs({ kind: "bar" }));
    expect(host.querySelectorAll(".dk-bar")).toHaveLength(3);
    expect(host.querySelector(".dk-bar")!.textContent).toContain("Alice");
  });
  it("tendance : courbe et flèche", () => {
    mount(attrs({ kind: "trend", value: 1 }));
    expect(host.querySelector("svg")).not.toBeNull();
    expect(host.querySelector(".live-trend")).not.toBeNull();
  });
});

describe("barre flottante", () => {
  it("changer de forme met à jour les attributs du bloc", () => {
    const { ed } = mount(attrs());
    host.querySelector<HTMLElement>('[data-kind="bar"]')!.click();
    expect(blockAttrs(ed).kind).toBe("bar");
    expect(host.querySelectorAll(".dk-bar")).toHaveLength(3);
  });
  it("En-tête bascule header", () => {
    const { ed } = mount(attrs());
    host.querySelector<HTMLElement>('[data-act="header"]')!.click();
    expect(blockAttrs(ed).header).toBe(false);
  });
  it("décocher une colonne la retire du tableau", () => {
    const { ed } = mount(attrs());
    host.querySelector<HTMLInputElement>('input[data-col="1"]')!.click();
    expect(blockAttrs(ed).cols).toEqual([0, 2]);
    expect(host.querySelectorAll("th")).toHaveLength(2);
  });
  it("choisir la colonne de valeur pour un graphique", () => {
    const { ed } = mount(attrs({ kind: "bar" }));
    const sel = host.querySelector<HTMLSelectElement>("select[data-act='value']")!;
    sel.value = "1";
    sel.dispatchEvent(new Event("change", { bubbles: true }));
    expect(blockAttrs(ed).value).toBe(1);
  });
});

describe("sélection dans un bloc lié", () => {
  const cell = (r: number, c: number) => host.querySelectorAll("tbody tr")[r].children[c] as HTMLElement;
  const drag = (from: HTMLElement, to: HTMLElement) => {
    from.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    to.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    to.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  };
  it("glisser sur des cellules propose Citer / Nouveau bloc avec l'adresse", () => {
    mount(attrs());
    drag(cell(1, 0), cell(2, 2));
    const pick = host.querySelector(".dk-block__pick")!;
    expect(pick.textContent).toContain("A3:C4");
  });
  it("Citer la sélection insère une puce de plage après le bloc", () => {
    const { ed } = mount(attrs());
    drag(cell(1, 0), cell(2, 2));
    host.querySelector<HTMLElement>('[data-act="cite"]')!.click();
    const ref = ed.view.state.doc.child(1).firstChild!;
    expect(ref.type.name).toBe("cellRef");
    expect(ref.attrs).toMatchObject({ sheet: "s1", ref: "A3:C4" });
  });
  it("Nouveau bloc lié insère un bloc de cette plage après le bloc", () => {
    const { ed } = mount(attrs());
    drag(cell(1, 0), cell(2, 2));
    host.querySelector<HTMLElement>('[data-act="newblock"]')!.click();
    expect(ed.view.state.doc.child(1).type.name).toBe("liveBlock");
    expect(ed.view.state.doc.child(1).attrs.ref).toBe("A3:C4");
  });
  it("tient compte des colonnes masquées", () => {
    mount(attrs({ cols: [0, 2] }));
    drag(cell(0, 0), cell(0, 1));
    expect(host.querySelector(".dk-block__pick")!.textContent).toContain("A2:C2");
  });
});
