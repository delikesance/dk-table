/**
 * Live Preview, the Obsidian way: the document is Markdown text; a state field derives decorations from the
 * syntax tree and the selection. Syntax marks (`**`, `#`, `[](…)`) are hidden while the cursor is not on their
 * element (inline: that element; titles, quotes, bullets, rules: that line; blocks: that whole block) and
 * chips / linked blocks are replaced by widgets.
 */
import { ensureSyntaxTree } from "@codemirror/language";
import { EditorState, RangeSetBuilder, StateField, type Range } from "@codemirror/state";
import { Decoration, EditorView, type DecorationSet } from "@codemirror/view";
import type { SyntaxNode } from "@lezer/common";
import { BLOCK_LANG } from "../md/chip";
import { liveHost, refreshFx, type LiveHost } from "./host";
import { BlockWidget, BulletWidget, CalcWidget, RefWidget, LangWidget, RuleWidget } from "./widgets";

const hide = Decoration.replace({});
const cls = (c: string): Decoration => Decoration.mark({ class: c });

/** Decorations of the whole document for the current selection. */
function build(state: EditorState): DecorationSet {
  const host: LiveHost | null = state.facet(liveHost);
  const doc = state.doc, out: Range<Decoration>[] = [];
  const sel = state.selection.ranges;
  /** Selection touches [from, to] (the edges do not count when `strict`). */
  const inside = (from: number, to: number, strict = false): boolean => sel.some((r) => (strict ? r.to > from && r.from < to : r.to >= from && r.from <= to));
  /** Selection is on one of the lines of [from, to]. */
  const onLine = (from: number, to: number): boolean => inside(doc.lineAt(from).from, doc.lineAt(to).to);
  const lines = (from: number, to: number, c: string): void => {
    for (let l = doc.lineAt(from).number; l <= doc.lineAt(to).number; l++) out.push(Decoration.line({ class: c }).range(doc.line(l).from));
  };
  /** Hide `[from, to)` (and `extra` spaces after it) unless `show`. */
  const mark = (from: number, to: number, show: boolean): void => { if (!show && to > from) out.push(hide.range(from, to)); };
  /** A code block: framed lines; away from the cursor the ``` lines are hidden and the language is labelled. */
  const fenced = (from: number, to: number, lang: string, marks: SyntaxNode[], show: boolean): void => {
    lines(from, to, "dk-codeblock");
    const first = doc.lineAt(from), last = doc.lineAt(to);
    out.push(Decoration.line({ class: "dk-cb-start" }).range(first.from));
    if (show) return;
    out.push(Decoration.replace(lang ? { widget: new LangWidget(lang) } : {}).range(first.from, first.to));
    if (marks.length > 1 && last.number > first.number) {
      out.push(Decoration.line({ class: "dk-cb-end" }).range(last.from));
      out.push(hide.range(last.from, last.to));
    }
  };
  let openU: SyntaxNode | null = null;

  ensureSyntaxTree(state, doc.length, 200)?.iterate({
    enter(n) {
      const { name: t, from, to } = n;
      const h = /^ATXHeading(\d)$/.exec(t);
      if (h) {
        lines(from, to, `dk-h dk-h${h[1]}`);
        const m = n.node.getChild("HeaderMark");
        if (m) mark(m.from, Math.min(m.to + 1, to), onLine(from, to));
      } else if (t === "StrongEmphasis" || t === "Emphasis") {
        out.push(cls(t === "Emphasis" ? "dk-em" : "dk-strong").range(from, to));
        n.node.getChildren("EmphasisMark").forEach((m) => mark(m.from, m.to, inside(from, to)));
      } else if (t === "InlineCode") {
        out.push(cls("dk-code").range(from, to));
        n.node.getChildren("CodeMark").forEach((m) => mark(m.from, m.to, inside(from, to)));
      } else if (t === "Link") {
        const m = n.node.getChildren("LinkMark");
        if (m.length >= 2) {
          out.push(cls("dk-link").range(m[0].to, m[1].from));
          mark(from, m[0].to, inside(from, to));
          mark(m[1].from, to, inside(from, to));
        }
      } else if (t === "HTMLTag") {
        const s = doc.sliceString(from, to).toLowerCase();
        if (s === "<u>") openU = n.node;
        else if (s === "</u>" && openU) {
          out.push(cls("dk-under").range(openU.to, from));
          const show = inside(openU.from, to);
          mark(openU.from, openU.to, show);
          mark(from, to, show);
          openU = null;
        }
      } else if (t === "Chip" && host) {
        const body = doc.sliceString(from + 3, to - 2);
        if (!inside(from, to, true)) {
          const w = doc.sliceString(from + 2, from + 3) === "@" ? new RefWidget(host, body) : new CalcWidget(host, body);
          out.push(Decoration.replace({ widget: w }).range(from, to));
        } else out.push(cls("dk-chip-src").range(from, to));
      } else if (t === "ListMark" && n.node.parent?.parent?.name === "BulletList" && !onLine(from, to)) {
        out.push(Decoration.replace({ widget: new BulletWidget() }).range(from, to));
      } else if (t === "QuoteMark") {
        lines(from, to, "dk-quote");
        mark(from, Math.min(to + 1, doc.lineAt(from).to), onLine(from, to));
      } else if (t === "HorizontalRule") {
        if (onLine(from, to)) lines(from, to, "dk-rule-src");
        else out.push(Decoration.replace({ widget: new RuleWidget() }).range(from, to));
      } else if (t === "FencedCode") {
        const info = n.node.getChild("CodeInfo"), code = n.node.getChild("CodeText");
        if (host && info && doc.sliceString(info.from, info.to).trim() === BLOCK_LANG && code && !inside(from, to)) {
          out.push(Decoration.replace({ widget: new BlockWidget(host, doc.sliceString(code.from, code.to)), block: true }).range(from, to));
        } else fenced(from, to, info ? doc.sliceString(info.from, info.to).trim() : "", n.node.getChildren("CodeMark"), inside(from, to));
        return false;
      }
      return undefined;
    },
  });
  const b = new RangeSetBuilder<Decoration>();
  out.sort((x, y) => x.from - y.from || x.value.startSide - y.value.startSide).forEach((r) => b.add(r.from, r.to, r.value));
  return b.finish();
}

/** The Live Preview decorations (rebuilt on text change, selection change and `refreshFx`). */
export const livePreview = StateField.define<DecorationSet>({
  create: build,
  update: (v, tr) => (tr.docChanged || tr.selection || tr.effects.some((e) => e.is(refreshFx)) ? build(tr.state) : v),
  provide: (f) => EditorView.decorations.from(f),
});
