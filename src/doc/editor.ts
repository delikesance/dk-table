/**
 * Editor of one dk doc, Obsidian "Live Preview" style: CodeMirror 6 over the Markdown text, syntax shown only on the
 * element under the cursor (see live/decorations.ts). `@` references, `=` calculations and linked blocks are
 * Markdown-level syntax (`{{@Feuille!B3}}`, `{{=…}}`, ```dkblock) drawn as widgets. The editor shows sheet names;
 * the callback receives the stored text (sheet ids).
 */
import { defaultKeymap, history, historyKeymap, redo, undo } from "@codemirror/commands";
import { markdown, markdownKeymap } from "@codemirror/lang-markdown";
import { indentUnit } from "@codemirror/language";
import { EditorState, Prec } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { chipConfig } from "./md/chipParser";
import { blockFence, calcChip, refChip } from "./md/chip";
import { formatSpec, type DocFormat } from "./md/format";
import { toEditorText, toStoredText } from "./md/names";
import { createCalc } from "./calc";
import { livePreview } from "./live/decorations";
import { refreshFx, sheetsOf, type LiveHost } from "./live/host";
import { docKeys } from "./live/keys";
import { docCompletion } from "./live/mention";
import type { BlockAttrs } from "./blocks";
import type { CopyInfo, RefBook, RefTarget } from "./refs";

export type { CopyInfo, DocFormat };

/** Handle of a mounted editor. */
export interface DocEditor {
  view: EditorView;
  /** Undo / redo the document's own history; false when there is nothing to do. */
  undo(): boolean;
  redo(): boolean;
  focus(): void;
  /** Run a text command (bold, title, list...) on the selection. */
  command(name: DocFormat): boolean;
  /** Insert a linked block after the cursor line. */
  insertBlock(a: BlockAttrs): void;
  /** Insert an empty calculation chip at the cursor (cursor inside). */
  insertCalc(): void;
  /** Insert text at the cursor. */
  insertText(t: string): void;
  /** Re-read every cited value (call after a recalculation). */
  refresh(): void;
  destroy(): void;
}

/** Workbook access for live references (omitted: plain Markdown editor). */
export interface DocEditorOptions {
  book: RefBook;
  /** Open the cited cell (click on a chip). */
  open(t: RefTarget): void;
  /** Last range copied in the grid; pasting its text inserts a live link. */
  lastCopy?(): CopyInfo | null | undefined;
}

/**
 * Mount an editor for the stored Markdown `md` in `host`. `onChange` receives the new stored text after each
 * modification (never at load). The editor owns its undo history.
 */
export function createDocEditor(host: HTMLElement, md: string, onChange: (md: string) => void, opts?: DocEditorOptions): DocEditor {
  const live: LiveHost | null = !opts ? null : { book: opts.book, open: opts.open, calc: createCalc(opts.book), slot: "A1", version: { n: 0 } };
  const sheets = () => (opts ? sheetsOf(live!) : []);
  const name = (id: string): string => sheets().find((s) => s.id === id)?.name ?? id;
  /** Put `text` as a block on its own lines after the cursor line. */
  const blockAfterLine = (text: string): void => {
    const line = view.state.doc.lineAt(view.state.selection.main.head), at = line.to;
    const insert = (line.text.trim() ? "\n\n" : "") + text + "\n";
    view.dispatch({ changes: { from: at, insert }, selection: { anchor: at + insert.length }, scrollIntoView: true });
    view.focus();
  };
  const state = EditorState.create({
    doc: toEditorText(md, sheets()),
    extensions: [
      history(), indentUnit.of("  "), EditorView.lineWrapping,
      markdown({ extensions: [chipConfig], addKeymap: false }),
      docCompletion(live), docKeys,
      Prec.high(keymap.of(markdownKeymap)), keymap.of([...historyKeymap, ...defaultKeymap]),
      ...(live ? [livePreview] : []),
      EditorView.updateListener.of((u) => { if (u.docChanged) onChange(toStoredText(u.state.doc.toString(), sheets())); }),
      EditorView.domEventHandlers({
        paste(e) {
          const copy = opts?.lastCopy?.(), text = e.clipboardData?.getData("text/plain") ?? "";
          if (!copy || !text || copy.text !== text) return false;
          e.preventDefault();
          if (copy.ref.includes(":")) blockAfterLine(blockFence({ sheet: name(copy.sheet), ref: copy.ref, kind: "table", header: true, cols: null, value: null }));
          else view.dispatch(view.state.replaceSelection(refChip({ sheet: name(copy.sheet), ref: copy.ref })));
          return true;
        },
      }),
    ],
  });
  const view = new EditorView({ state, parent: host });
  return {
    view,
    undo: () => undo(view),
    redo: () => redo(view),
    focus: () => view.focus(),
    command: (n) => { view.focus(); view.dispatch(formatSpec(view.state, n)); return true; },
    insertBlock: (a) => blockAfterLine(blockFence({ ...a, sheet: name(a.sheet) })),
    insertCalc: () => {
      const at = view.state.selection.main.head;
      view.dispatch({ changes: { from: at, insert: calcChip("", "auto") }, selection: { anchor: at + 3 } });
      view.focus();
    },
    insertText: (t) => { view.dispatch({ ...view.state.replaceSelection(t), userEvent: "input.type" }); view.focus(); },
    refresh: () => { if (live) { live.version.n++; view.dispatch({ effects: refreshFx.of(null) }); } },
    destroy: () => view.destroy(),
  };
}
