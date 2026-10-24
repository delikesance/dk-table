/** ProseMirror editor of one dk doc: schema, history, formatting shortcuts, JSON change callback. */
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Node } from "prosemirror-model";
import { history, undo, redo } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { baseKeymap, toggleMark, setBlockType } from "prosemirror-commands";
import { splitListItem, liftListItem, sinkListItem } from "prosemirror-schema-list";
import { docSchema } from "./schema";
import type { DocText } from "../io/types";

/** Handle of a mounted editor. */
export interface DocEditor {
  view: EditorView;
  /** Undo / redo the document's own history; false when there is nothing to do. */
  undo(): boolean;
  redo(): boolean;
  focus(): void;
  destroy(): void;
}

/** Formatting and structure shortcuts (Ctrl+B/I/U, Ctrl+Alt+1..3 titles, lists, Tab to indent). */
function shortcuts() {
  const s = docSchema;
  const li = s.nodes.list_item;
  return keymap({
    "Mod-b": toggleMark(s.marks.strong),
    "Mod-i": toggleMark(s.marks.em),
    "Mod-u": toggleMark(s.marks.underline),
    "Mod-z": undo, "Mod-y": redo, "Shift-Mod-z": redo,
    "Mod-Alt-0": setBlockType(s.nodes.paragraph),
    "Mod-Alt-1": setBlockType(s.nodes.heading, { level: 1 }),
    "Mod-Alt-2": setBlockType(s.nodes.heading, { level: 2 }),
    "Mod-Alt-3": setBlockType(s.nodes.heading, { level: 3 }),
    Enter: splitListItem(li), Tab: sinkListItem(li), "Shift-Tab": liftListItem(li),
  });
}

/**
 * Mount an editor for `content` in `host`. `onChange` receives the new JSON after each
 * modification (never at load). The editor owns its undo history.
 */
export function createDocEditor(host: HTMLElement, content: DocText["content"], onChange: (c: DocText["content"]) => void): DocEditor {
  const state = EditorState.create({
    doc: Node.fromJSON(docSchema, content),
    plugins: [history(), shortcuts(), keymap(baseKeymap)],
  });
  const view = new EditorView(host, {
    state,
    dispatchTransaction(tr) {
      view.updateState(view.state.apply(tr));
      if (tr.docChanged) onChange(view.state.doc.toJSON() as DocText["content"]);
    },
  });
  const run = (cmd: typeof undo): boolean => cmd(view.state, view.dispatch);
  return {
    view,
    undo: () => run(undo),
    redo: () => run(redo),
    focus: () => view.focus(),
    destroy: () => view.destroy(),
  };
}
