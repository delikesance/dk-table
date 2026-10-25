// @vitest-environment jsdom
/** Live Preview: syntax hidden away from the cursor, chips and blocks as widgets, `=` and chip keys. */
import { describe, expect, it, vi } from "vitest";
import { EditorView } from "@codemirror/view";
import { createDocEditor, type DocEditor } from "./editor";
import { createSheet, setCell } from "../engine/sheet";
import type { RefBook } from "./refs";

const sheet = createSheet();
setCell(sheet, "A1", "Nom"); setCell(sheet, "B1", "CA"); setCell(sheet, "A2", "Bob"); setCell(sheet, "B2", "40");
const book: RefBook = { sheets: () => [{ id: "s1", name: "Ventes", sheet, styles: {} }] };
const open = vi.fn();

/** Mount an editor on `md` with the cursor at `at` (default: end of the text, i.e. away from the first line). */
function mount(md: string, at?: number, onChange: (m: string) => void = () => {}): DocEditor {
  const host = document.body.appendChild(document.createElement("div"));
  const ed = createDocEditor(host, md, onChange, { book, open });
  ed.view.dispatch({ selection: { anchor: at ?? ed.view.state.doc.length } });
  return ed;
}
const shown = (ed: DocEditor): string => ed.view.contentDOM.textContent ?? "";

describe("syntax hidden away from the cursor", () => {
  it("hides # of a title until the cursor is on its line", () => {
    const ed = mount("# Titre\n\nfin");
    expect(shown(ed)).toBe("Titrefin");
    ed.view.dispatch({ selection: { anchor: 3 } });
    expect(shown(ed)).toBe("# Titrefin");
    expect(ed.view.contentDOM.querySelector(".dk-h1")).not.toBeNull();
  });
  it("hides ** and * of the element only, per element", () => {
    const ed = mount("un **gras** et *ital*\n\nfin");
    expect(shown(ed)).toBe("un gras et italfin");
    ed.view.dispatch({ selection: { anchor: 6 } });
    expect(shown(ed)).toBe("un **gras** et italfin");
    expect(ed.view.contentDOM.querySelector(".dk-strong")).not.toBeNull();
  });
  it("hides link syntax, code ticks and underline tags", () => {
    const ed = mount("[lien](http://x) `c` <u>so</u>\n\nfin");
    expect(shown(ed)).toBe("lien c sofin");
    expect(ed.view.contentDOM.querySelector(".dk-under")).not.toBeNull();
  });
  it("draws bullets and rules, quote marks, until the line is edited", () => {
    const ed = mount("- a\n\n> q\n\n---\n\nfin");
    expect(shown(ed)).toBe("• aqfin");
    expect(ed.view.contentDOM.querySelector("hr")).not.toBeNull();
    ed.view.dispatch({ selection: { anchor: 1 } });
    expect(shown(ed)).toContain("- a");
  });
});

describe("chips and blocks", () => {
  it("draws a reference, a calculation and a linked block as widgets", () => {
    const ed = mount("a {{@Ventes!B2}} {{=Ventes!B2*2}}\n\n```dkblock\n" + '{"sheet":"Ventes","ref":"A1:B2","kind":"table","header":true,"cols":null,"value":null}' + "\n```\n\nfin");
    const dom = ed.view.contentDOM;
    expect(dom.querySelector(".dk-ref")!.textContent).toBe("40");
    expect(dom.querySelector(".dk-calc")!.textContent).toBe("80");
    expect(dom.querySelectorAll(".dk-block th")).toHaveLength(2);
    expect(shown(ed)).not.toContain("{{");
  });
  it("shows the source of a chip while the cursor is strictly inside, the value at its edges", () => {
    const ed = mount("{{=1+1}} fin", 8);
    expect(ed.view.contentDOM.querySelector(".dk-calc")).not.toBeNull();
    ed.view.dispatch({ selection: { anchor: 4 } });
    expect(ed.view.contentDOM.querySelector(".dk-calc")).toBeNull();
    expect(shown(ed)).toContain("{{=1+1}}");
  });
  it("shows the fence of a block while the cursor is in it", () => {
    const md = "```dkblock\n" + '{"sheet":"Ventes","ref":"A1:B2","kind":"table","header":true,"cols":null,"value":null}' + "\n```\n";
    const ed = mount(md, 14);
    expect(ed.view.contentDOM.querySelector(".dk-block")).toBeNull();
    expect(shown(ed)).toContain("dkblock");
  });
  it("refresh() redraws the values after a recalculation", () => {
    const ed = mount("{{@Ventes!B2}}\n\nfin");
    setCell(sheet, "B2", "99");
    ed.refresh();
    expect(ed.view.contentDOM.querySelector(".dk-ref")!.textContent).toBe("99");
    setCell(sheet, "B2", "40");
  });
  it("hands the stored text (sheet ids) to onChange", () => {
    const seen: string[] = [];
    const ed = mount("", 0, (m) => seen.push(m));
    ed.view.dispatch({ changes: { from: 0, insert: "{{@Ventes!B2}} {{=Ventes!B2+1}}" } });
    expect(seen.at(-1)).toBe("{{@s1!B2}} {{={s1}!B2+1}}");
  });
});

describe("keys and rules", () => {
  /** True when an input handler takes the typed `text` at `from`. */
  const handled = (ed: DocEditor, from: number, text: string): boolean => ed.view.state.facet(EditorView.inputHandler).some((h) => h(ed.view, from, from, text, () => ed.view.state.update({ changes: { from, insert: text } })));
  it("`=` at the start of a word opens an empty calculation chip", () => {
    const ed = mount("", 0);
    expect(handled(ed, 0, "=")).toBe(true);
    expect(ed.view.state.doc.toString()).toBe("{{=}}");
    expect(ed.view.state.selection.main.head).toBe(3);
  });
  it("`=` glued to a word stays a character", () => {
    const ed = mount("a", 1);
    expect(handled(ed, 1, "=")).toBe(false);
  });
  it("Enter inside a chip leaves it, Backspace after a chip removes it whole", () => {
    const ed = mount("{{=1+1}} fin", 4);
    ed.view.contentDOM.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(ed.view.state.selection.main.head).toBe(8);
    ed.view.contentDOM.dispatchEvent(new KeyboardEvent("keydown", { key: "Backspace", bubbles: true }));
    expect(ed.view.state.doc.toString()).toBe(" fin");
  });
});
