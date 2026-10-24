/** Lua code editor (CodeMirror 6): syntax highlighting, autocompletion, Ctrl/Cmd+Enter to run. */
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, drawSelection, highlightActiveLine } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { StreamLanguage, syntaxHighlighting, bracketMatching, indentOnInput } from "@codemirror/language";
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap,
  type Completion, type CompletionContext, type CompletionResult } from "@codemirror/autocomplete";
import { classHighlighter } from "@lezer/highlight";
import { lua } from "@codemirror/legacy-modes/mode/lua";
import { complete } from "../../macros/complete";
import type { Doc } from "../../macros/luadocs";

/** Editor callbacks. */
export interface LuaEditorOptions {
  code: string;
  onChange(code: string): void;
  onRun(): void;
}

/** Public editor handle. */
export interface LuaEditor {
  view: EditorView;
  /** Load another macro: fresh document and undo history, without firing onChange. */
  setCode(code: string): void;
  focus(): void;
}

/** Insert `name()` with the cursor between the parentheses when the function takes arguments. */
function applyFn(d: Doc) {
  return (view: EditorView, _c: Completion, from: number, to: number) => {
    const text = `${d.label}()`, inside = !d.detail.endsWith("()");
    view.dispatch({ changes: { from, to, insert: text }, selection: { anchor: from + text.length - (inside ? 1 : 0) } });
  };
}

/** CodeMirror completion source backed by `complete()`. */
export function luaCompletions(ctx: CompletionContext): CompletionResult | null {
  const r = complete(ctx.state.doc.toString(), ctx.pos, ctx.explicit);
  if (!r) return null;
  return {
    from: r.from,
    validFor: /^\w*$/,
    options: r.options.map((d) => ({
      label: d.label, type: d.kind === "namespace" ? "namespace" : d.kind, detail: d.ret,
      info: d.info ? `${d.detail} : ${d.info}` : undefined,
      apply: d.kind === "function" ? applyFn(d) : undefined,
    })),
  };
}

/** Description line placed under the completion list (instead of beside it). */
const infoBelow = () => ({ class: "dk-cm-info-below" });

/** Mount a Lua editor in `host`. */
export function createLuaEditor(host: HTMLElement, o: LuaEditorOptions): LuaEditor {
  const extensions = [
    lineNumbers(), history(), drawSelection(), highlightActiveLine(), indentOnInput(), bracketMatching(), closeBrackets(),
    StreamLanguage.define(lua), syntaxHighlighting(classHighlighter),
    autocompletion({ override: [luaCompletions], icons: false, positionInfo: infoBelow }),
    keymap.of([
      { key: "Mod-Enter", run: () => (o.onRun(), true) },
      ...closeBracketsKeymap, ...completionKeymap, ...defaultKeymap, ...historyKeymap, indentWithTab,
    ]),
    EditorState.tabSize.of(2), EditorView.lineWrapping,
    EditorView.contentAttributes.of({ "aria-label": "Code Lua de la macro" }),
    EditorView.updateListener.of((u) => { if (u.docChanged) o.onChange(u.state.doc.toString()); }),
  ];
  const state = (doc: string) => EditorState.create({ doc, extensions });
  const view = new EditorView({ parent: host, state: state(o.code) });
  return {
    view,
    setCode: (code) => view.setState(state(code)),
    focus: () => view.focus(),
  };
}
