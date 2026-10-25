/** Text edits behind the Format menu and the shortcuts: they add or remove Markdown syntax around the selection or on its lines. */
import { EditorSelection, type EditorState, type TransactionSpec } from "@codemirror/state";

/** Name accepted by `DocEditor.command`. */
export type DocFormat = "strong" | "em" | "underline" | "p" | "h1" | "h2" | "h3" | "bullet" | "ordered" | "quote";

/** Wrap the selection in `open`/`close` (remove them when they already surround it); an empty selection gets a pair with the cursor inside. */
export function toggleWrap(state: EditorState, open: string, close = open): TransactionSpec {
  return state.changeByRange((r) => {
    const d = state.doc, before = d.sliceString(Math.max(0, r.from - open.length), r.from), after = d.sliceString(r.to, r.to + close.length);
    if (!r.empty && before === open && after === close) {
      return { changes: [{ from: r.from - open.length, to: r.from }, { from: r.to, to: r.to + close.length }], range: EditorSelection.range(r.from - open.length, r.to - open.length) };
    }
    return { changes: [{ from: r.from, insert: open }, { from: r.to, insert: close }], range: EditorSelection.range(r.from + open.length, r.to + open.length) };
  });
}

const HEAD = /^#{1,6}\s+/;
const PREFIX = { bullet: /^(\s*)[-*+]\s/, ordered: /^(\s*)\d+[.)]\s/, quote: /^(\s*)>\s?/ };

/** Rewrite every line touched by a selection range with `f(text, index)`. */
function lineEdit(state: EditorState, f: (text: string, i: number, lines: string[]) => string): TransactionSpec {
  return state.changeByRange((r) => {
    const a = state.doc.lineAt(r.from).number, b = state.doc.lineAt(r.to).number;
    const lines = Array.from({ length: b - a + 1 }, (_, i) => state.doc.line(a + i));
    const texts = lines.map((l) => l.text);
    const cs = state.changes(lines.map((l, i) => ({ from: l.from, to: l.to, insert: f(l.text, i, texts) })).filter((c, i) => c.insert !== lines[i].text));
    return { changes: cs, range: r.map(cs) };
  });
}

/** Title of `level` (1-3) on the selected lines; level 0 = plain paragraph. Same level again removes it. */
export function setHeading(state: EditorState, level: number): TransactionSpec {
  return lineEdit(state, (t) => {
    const cur = /^(#{1,6})\s/.exec(t)?.[1].length ?? 0;
    return (level && cur !== level ? "#".repeat(level) + " " : "") + t.replace(HEAD, "");
  });
}

/** Bullet / numbered list or quote on the selected lines; removed when all of them already have it. */
export function toggleLinePrefix(state: EditorState, kind: keyof typeof PREFIX): TransactionSpec {
  return lineEdit(state, (t, i, all) => {
    const has = all.filter((l) => l.trim()).every((l) => PREFIX[kind].test(l));
    const bare = t.replace(PREFIX.bullet, "$1").replace(PREFIX.ordered, "$1").replace(kind === "quote" ? PREFIX.quote : /^$/, "$1");
    if (has) return t.replace(PREFIX[kind], "$1");
    if (!t.trim()) return t;
    return (kind === "bullet" ? "- " : kind === "ordered" ? `${i + 1}. ` : "> ") + (kind === "quote" ? t.replace(PREFIX.quote, "$1") : bare);
  });
}

/** Edit that applies the format `name` to `state`. */
export function formatSpec(state: EditorState, name: DocFormat): TransactionSpec {
  switch (name) {
    case "strong": return toggleWrap(state, "**");
    case "em": return toggleWrap(state, "*");
    case "underline": return toggleWrap(state, "<u>", "</u>");
    case "p": return setHeading(state, 0);
    case "h1": return setHeading(state, 1);
    case "h2": return setHeading(state, 2);
    case "h3": return setHeading(state, 3);
    default: return toggleLinePrefix(state, name);
  }
}
