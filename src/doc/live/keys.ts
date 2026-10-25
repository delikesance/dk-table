/** Keys of the dk doc editor: formats, `=` chip, and whole-chip deletion. */
import { indentLess, indentMore } from "@codemirror/commands";
import { syntaxTree } from "@codemirror/language";
import { EditorSelection, Prec, type Extension } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { chipAround } from "../md/chip";
import { formatSpec, type DocFormat } from "../md/format";
import { liveHost } from "./host";

/** Chip (in line-relative offsets) that the main cursor is `strict`ly inside or touching, with its line start. */
function chipAtCursor(view: EditorView, strict: boolean): { from: number; to: number } | null {
  const h = view.state.selection.main;
  if (!h.empty) return null;
  const line = view.state.doc.lineAt(h.head), c = chipAround(line.text, h.head - line.from, strict);
  return c && { from: line.from + c.from, to: line.from + c.to };
}

/** Enter / Tab inside a chip: leave it, cursor after `}}`. */
function leaveChip(view: EditorView): boolean {
  const c = chipAtCursor(view, true);
  if (!c) return false;
  view.dispatch({ selection: EditorSelection.cursor(c.to) });
  return true;
}

/** Backspace right after a chip (or Delete right before it) removes the whole chip. */
function deleteChip(forward: boolean) {
  return (view: EditorView): boolean => {
    const c = chipAtCursor(view, false), head = view.state.selection.main.head;
    if (!c || head !== (forward ? c.from : c.to)) return false;
    view.dispatch({ changes: { from: c.from, to: c.to }, selection: EditorSelection.cursor(c.from) });
    return true;
  };
}

/** True when the cursor line is a list item (Tab then indents it). */
const inList = (view: EditorView): boolean => /^\s*([-*+]|\d+[.)])\s/.test(view.state.doc.lineAt(view.state.selection.main.head).text);

const fmt = (name: DocFormat) => (view: EditorView): boolean => { view.dispatch(formatSpec(view.state, name)); return true; };

/** Keymap (highest precedence) and the `=` input rule. */
export const docKeys: Extension = [
  Prec.high(keymap.of([
    { key: "Mod-b", run: fmt("strong") }, { key: "Mod-i", run: fmt("em") }, { key: "Mod-u", run: fmt("underline") },
    { key: "Mod-Alt-0", run: fmt("p") }, { key: "Mod-Alt-1", run: fmt("h1") }, { key: "Mod-Alt-2", run: fmt("h2") }, { key: "Mod-Alt-3", run: fmt("h3") },
    { key: "Enter", run: leaveChip }, { key: "Tab", run: (v) => leaveChip(v) || (inList(v) && indentMore(v)) },
    { key: "Shift-Tab", run: (v) => inList(v) && indentLess(v) },
    { key: "Backspace", run: deleteChip(false) }, { key: "Delete", run: deleteChip(true) },
  ])),
  /** `=` at the start of a word (or line) opens an empty calculation chip. */
  EditorView.inputHandler.of((view, from, to, text) => {
    if (text !== "=" || !view.state.facet(liveHost)) return false;
    const before = view.state.doc.sliceString(Math.max(0, from - 1), from);
    if (before !== "" && !/\s/.test(before) && before !== "\n") return false;
    const node = syntaxTree(view.state).resolveInner(from, -1).name;
    if (/Code|Chip|HTML/.test(node)) return false;
    view.dispatch({ changes: { from, to, insert: "{{=}}" }, selection: EditorSelection.cursor(from + 3), userEvent: "input.type" });
    return true;
  }),
];
