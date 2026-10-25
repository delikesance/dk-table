/** ProseMirror editor of one dk doc: schema, history, formatting shortcuts, JSON change callback. */
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Node } from "prosemirror-model";
import { history, undo, redo } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { baseKeymap, toggleMark, setBlockType } from "prosemirror-commands";
import { splitListItem, liftListItem, sinkListItem } from "prosemirror-schema-list";
import { docSchema } from "./schema";
import { mentionPlugin } from "./mention";
import { RefView, type RefViewHost } from "./refView";
import { BlockView, type BlockHost } from "./blockView";
import { insertAfterBlock, pasteLink } from "./paste";
import { docCommands, type DocFormat } from "./commands";
import type { BlockAttrs } from "./blocks";
import type { CopyInfo, RefBook, RefTarget } from "./refs";

export type { CopyInfo };
import type { DocText } from "../io/types";

/** Handle of a mounted editor. */
export interface DocEditor {
  view: EditorView;
  /** Undo / redo the document's own history; false when there is nothing to do. */
  undo(): boolean;
  redo(): boolean;
  focus(): void;
  /** Run a text command (bold, title, list...) on the selection. */
  command(name: DocFormat): boolean;
  /** Insert a linked block at the cursor (after the current block). */
  insertBlock(a: BlockAttrs): void;
  /** Insert text at the cursor. */
  insertText(t: string): void;
  /** Re-read every cited value (call after a recalculation). */
  refresh(): void;
  destroy(): void;
}

/** Workbook access for live references (omitted: plain text editor). */
export interface DocEditorOptions {
  book: RefBook;
  /** Open the cited cell (click on a chip). */
  open(t: RefTarget): void;
  /** Last range copied in the grid; pasting its text inserts a live link. */
  lastCopy?(): CopyInfo | null | undefined;
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
export function createDocEditor(host: HTMLElement, content: DocText["content"], onChange: (c: DocText["content"]) => void, opts?: DocEditorOptions): DocEditor {
  const rh: RefViewHost | undefined = opts && { book: opts.book, open: opts.open, views: new Set() };
  const bh: BlockHost | undefined = opts && { book: opts.book, views: new Set(), set: (pos, a) => view.dispatch(view.state.tr.setNodeMarkup(pos, undefined, a)), insertAfter: (pos, kind, a) => insertAfterBlock(view, pos, kind, a) };
  const state = EditorState.create({
    doc: Node.fromJSON(docSchema, content),
    plugins: [...(opts ? [mentionPlugin(opts.book)] : []), history(), shortcuts(), keymap(baseKeymap)],
  });
  const view = new EditorView(host, {
    state,
    nodeViews: rh && bh && { cellRef: (node) => new RefView(node, rh), liveBlock: (node, _v, getPos) => new BlockView(node, getPos, bh) },
    handlePaste: (v, e) => !!opts?.lastCopy && pasteLink(v, e.clipboardData?.getData("text/plain") ?? "", opts.lastCopy()),
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
    command: (name) => { view.focus(); return docCommands[name](view.state, view.dispatch, view); },
    insertBlock: (a) => { view.dispatch(view.state.tr.replaceSelectionWith(docSchema.nodes.liveBlock.create({ ...a })).scrollIntoView()); view.focus(); },
    insertText: (t) => { view.dispatch(view.state.tr.insertText(t)); view.focus(); },
    refresh: () => { rh?.views.forEach((v) => v.refresh()); bh?.views.forEach((v) => v.refresh()); },
    destroy: () => view.destroy(),
  };
}
