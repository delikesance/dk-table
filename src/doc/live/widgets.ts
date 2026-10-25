/** Widgets of the Live Preview: reference chip, calculation chip, linked block, bullet and rule. */
import { WidgetType, type EditorView } from "@codemirror/view";
import { readRange, type BlockAttrs } from "../blocks";
import { renderBody } from "../blockRender";
import { toStored } from "../calcSrc";
import { resolveRef } from "../refs";
import { parseBlock, parseCalc, parseRef } from "../md/chip";
import { idOf, sheetsOf, type LiveHost } from "./host";

/** Element with a class and optional text. */
function mk<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/** Base of the widgets that read the workbook: redrawn when the host version or the source text changes. */
abstract class LiveWidget extends WidgetType {
  private v: number;
  constructor(protected host: LiveHost, protected src: string) { super(); this.v = host.version.n; }
  eq(o: WidgetType): boolean { return o instanceof this.constructor && (o as LiveWidget).src === this.src && (o as LiveWidget).v === this.v; }
  ignoreEvent(): boolean { return true; }
}

/** `{{@Sheet!B3}}`: the cited value; a click follows the reference. */
export class RefWidget extends LiveWidget {
  toDOM(): HTMLElement {
    const t = parseRef(this.src), id = t ? idOf(this.host, t.sheet) : "";
    const r = resolveRef(this.host.book, { sheet: id, ref: t?.ref ?? "" });
    const e = mk("span", r.error || !t ? "dk-ref dk-ref--err" : "dk-ref", t ? r.text : "#REF!");
    e.title = r.address;
    e.addEventListener("mousedown", (ev) => { ev.preventDefault(); if (t && !r.error) this.host.open({ sheet: id, ref: t.ref }); });
    return e;
  }
}

/** `{{=formula|format}}`: the computed value (or mini-chart); a click opens the source for editing. */
export class CalcWidget extends LiveWidget {
  toDOM(view: EditorView): HTMLElement {
    const { src, fmt } = parseCalc(this.src);
    const r = this.host.calc.eval(this.host.slot, toStored(src, sheetsOf(this.host)), fmt);
    const e = mk("span", r.error ? "dk-calc dk-calc--err" : "dk-calc");
    if (r.html) e.innerHTML = r.html; else e.textContent = r.text || "=";
    e.title = `=${src}`;
    e.addEventListener("mousedown", (ev) => {
      ev.preventDefault();
      view.dispatch({ selection: { anchor: view.posAtDOM(e) + 3 } });
      view.focus();
    });
    return e;
  }
}

const KINDS: [BlockAttrs["kind"], string][] = [["table", "Tableau"], ["bar", "Barres"], ["trend", "Tendance"]];

/** ```dkblock fence: the linked range as a table, bars or trend, with a small bar to change shape and header. */
export class BlockWidget extends LiveWidget {
  toDOM(view: EditorView): HTMLElement {
    const dom = mk("div", "dk-block"), a = parseBlock(this.src);
    dom.contentEditable = "false";
    const d = a && readRange(this.host.book, { ...a, sheet: idOf(this.host, a.sheet) });
    if (!a || !d) {
      dom.classList.add("dk-block--err");
      dom.append(mk("div", "dk-block__error", "#REF! · la feuille ou la plage citée n'existe plus"));
      return dom;
    }
    const attrs = { ...a, sheet: idOf(this.host, a.sheet) };
    const patch = (p: Partial<BlockAttrs>): void => {
      const line = view.state.doc.line(view.state.doc.lineAt(view.posAtDOM(dom)).number + 1);
      view.dispatch({ changes: { from: line.from, to: line.to, insert: JSON.stringify({ ...a, ...p }) } });
    };
    const bar = mk("div", "dk-block__bar");
    KINDS.forEach(([k, label]) => {
      const b = mk("button", k === a.kind ? "dk-block__btn dk-block__btn--on" : "dk-block__btn", label);
      b.dataset.kind = k;
      b.onmousedown = (e) => { e.preventDefault(); patch({ kind: k }); };
      bar.append(b);
    });
    const h = mk("button", a.header ? "dk-block__btn dk-block__btn--on" : "dk-block__btn", `${a.header ? "☑" : "☐"} En-tête`);
    h.dataset.act = "header";
    h.onmousedown = (e) => { e.preventDefault(); patch({ header: !a.header }); };
    bar.append(h);
    const tag = mk("span", "dk-block__tag", `${d.sheetName}!${a.ref} · liée`);
    dom.append(bar, tag, renderBody(d, attrs));
    return dom;
  }
}

/** Bullet drawn in place of `-` / `*` when the line is not being edited. */
export class BulletWidget extends WidgetType {
  eq(o: WidgetType): boolean { return o instanceof BulletWidget; }
  toDOM(): HTMLElement { return mk("span", "dk-bullet", "•"); }
}

/** Horizontal rule drawn in place of `---` when the line is not being edited. */
export class RuleWidget extends WidgetType {
  eq(o: WidgetType): boolean { return o instanceof RuleWidget; }
  toDOM(): HTMLElement { return mk("hr", "dk-rule"); }
}

/** Language name of a fenced code block, shown in place of the opening ``` line. */
export class LangWidget extends WidgetType {
  constructor(private readonly lang: string) { super(); }
  eq(o: LangWidget): boolean { return o.lang === this.lang; }
  toDOM(): HTMLElement { const e = document.createElement("span"); e.className = "dk-cb-lang"; e.textContent = this.lang; return e; }
}
