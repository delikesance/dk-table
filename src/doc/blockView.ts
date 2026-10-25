/** Node view of a `liveBlock`: tag with the linked range, body (table / bars / trend), floating bar when selected. */
import type { Node } from "prosemirror-model";
import type { NodeView } from "prosemirror-view";
import { readRange, type BlockAttrs } from "./blocks";
import { colName, renderBody } from "./blockRender";
import { bindPick } from "./blockPick";
import type { RefBook } from "./refs";

/** What a block view needs from the editor. */
export interface BlockHost {
  book: RefBook;
  views: Set<BlockView>;
  /** Replace the attributes of the block at `pos`. */
  set(pos: number, a: BlockAttrs): void;
  /** Insert `node` (block or inline-in-paragraph) right after the block at `pos`. */
  insertAfter(pos: number, kind: "cite" | "block", a: BlockAttrs): void;
}

const KINDS: [BlockAttrs["kind"], string][] = [["table", "Tableau"], ["bar", "Barres"], ["trend", "Tendance"]];

/** Small helper: element with class and text. */
function mk<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text = ""): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = cls;
  e.textContent = text;
  return e;
}

/** A linked range inside a document. */
export class BlockView implements NodeView {
  dom = mk("div", "dk-block");
  private bar = mk("div", "dk-block__bar");
  private tag = mk("span", "dk-block__tag");
  private body = mk("div", "dk-block__content");
  private node: Node;
  private colsOpen = false;
  constructor(node: Node, private getPos: () => number | undefined, private host: BlockHost) {
    this.node = node;
    this.dom.contentEditable = "false";
    this.dom.append(this.bar, this.tag, this.body);
    host.views.add(this);
    bindPick(this.dom, () => this.a, (kind, ref) => {
      const pos = this.getPos();
      if (pos !== undefined) host.insertAfter(pos, kind, { ...this.a, ref });
    });
    this.refresh();
  }
  private get a(): BlockAttrs { return this.node.attrs as BlockAttrs; }
  private patch(p: Partial<BlockAttrs>): void {
    const pos = this.getPos();
    if (pos !== undefined) this.host.set(pos, { ...this.a, ...p });
  }
  /** Re-read the range and redraw (call after a recalculation). */
  refresh(): void {
    const d = readRange(this.host.book, this.a);
    this.dom.classList.toggle("dk-block--err", !d);
    if (!d) {
      this.tag.textContent = `${this.a.ref} · cible supprimée`;
      this.bar.replaceChildren();
      this.body.replaceChildren(mk("div", "dk-block__error", "#REF! · la feuille ou la plage citée n'existe plus"));
      return;
    }
    this.tag.textContent = `${d.sheetName}!${this.a.ref} · liée`;
    this.body.replaceChildren(renderBody(d, this.a));
    this.drawBar(d.rows[0]?.length ?? 0, (i) => colName(d, this.a, i));
  }
  /** Floating bar: shape, header toggle, column checklist (table), value column (charts). */
  private drawBar(width: number, name: (i: number) => string): void {
    const a = this.a, bar = this.bar;
    bar.replaceChildren();
    KINDS.forEach(([k, label]) => {
      const b = mk("button", k === a.kind ? "dk-block__btn dk-block__btn--on" : "dk-block__btn", label);
      b.dataset.kind = k;
      b.onclick = () => this.patch({ kind: k });
      bar.append(b);
    });
    const h = mk("button", a.header ? "dk-block__btn dk-block__btn--on" : "dk-block__btn", `${a.header ? "☑" : "☐"} En-tête`);
    h.dataset.act = "header";
    h.onclick = () => this.patch({ header: !a.header });
    bar.append(h);
    if (a.kind === "table") bar.append(this.colsList(width, name));
    else bar.append(this.valueSelect(width, name));
  }
  private colsList(width: number, name: (i: number) => string): HTMLElement {
    const on = new Set(this.a.cols ?? Array.from({ length: width }, (_, i) => i));
    const det = mk("details", "dk-block__cols");
    det.open = this.colsOpen;
    det.ontoggle = () => { this.colsOpen = det.open; };
    det.append(mk("summary", "dk-block__btn", `Colonnes ${on.size}/${width}`));
    for (let i = 0; i < width; i++) {
      const lab = mk("label", "dk-block__col"), box = document.createElement("input");
      box.type = "checkbox"; box.checked = on.has(i); box.dataset.col = String(i);
      box.onchange = () => {
        const next = new Set(on);
        if (box.checked) next.add(i); else next.delete(i);
        if (next.size === 0) { box.checked = true; return; }
        this.patch({ cols: next.size === width ? null : [...next].sort((x, y) => x - y) });
      };
      lab.append(box, name(i));
      det.append(lab);
    }
    return det;
  }
  private valueSelect(width: number, name: (i: number) => string): HTMLElement {
    const lab = mk("label", "dk-block__btn", "Valeur : "), sel = document.createElement("select");
    sel.dataset.act = "value";
    for (let i = 0; i < width; i++) sel.append(new Option(name(i), String(i), false, i === (this.a.value ?? width - 1)));
    sel.onchange = () => this.patch({ value: Number(sel.value) });
    lab.append(sel);
    return lab;
  }
  update(node: Node): boolean {
    if (node.type !== this.node.type) return false;
    this.node = node;
    this.refresh();
    return true;
  }
  selectNode(): void { this.dom.classList.add("ProseMirror-selectednode"); }
  deselectNode(): void { this.dom.classList.remove("ProseMirror-selectednode"); }
  stopEvent(e: Event): boolean { return e.type !== "dragstart" && this.dom.contains(e.target as globalThis.Node); }
  ignoreMutation(): boolean { return true; }
  destroy(): void { this.host.views.delete(this); }
}
