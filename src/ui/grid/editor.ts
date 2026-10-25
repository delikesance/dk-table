/** Inline cell editor: textarea creation and key/blur handling, decoupled from the grid state. */
import { cycleRefIn } from "./refcycle";
import { attachFnComplete } from "../formula/fnPopup";
import { toInput } from "../formula/syntax";

const MOVES: Record<string, [number, number]> = {
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
};

/** Callbacks the editor drives. */
export interface EditorHandlers {
  /** Close the editor, committing when `commit`; `refocus` gives focus back to the grid. */
  end(commit: boolean, refocus: boolean): void;
  /** Move the cursor after a commit. */
  move(dc: number, dr: number): void;
  /** Ctrl+Enter: commit the value into every selected cell (one undo step) and close. */
  commitAll(): void;
}

/** Open state of the editor (a textarea so Alt+Enter can insert line breaks). */
export interface Editor { input: HTMLTextAreaElement; typed: boolean }

/**
 * Create the editor textarea inside `el`.
 * Enter/Tab commit and move, Ctrl+Enter commits into the whole selection, Alt+Enter inserts a line break,
 * F4 cycles $ on the reference at the caret, Escape cancels, arrows commit+move only when the user typed;
 * other Ctrl/Meta combos are left to bubble up to document; blur commits.
 * The function popup (`formula/fnPopup.ts`) is attached first so its list takes arrows/Enter/Tab/Escape while open.
 */
export function openEditor(el: HTMLElement, value: string, typed: boolean, h: EditorHandlers): Editor {
  const input = document.createElement("textarea");
  input.className = "dkg-editor";
  input.rows = 1;
  input.spellcheck = false;
  input.value = toInput(value);
  el.replaceChildren(input);
  input.focus();
  if (!typed) input.select();
  const fns = attachFnComplete(input);
  const end = h.end;
  h = { ...h, end: (commit, refocus) => { fns.destroy(); end(commit, refocus); } };
  input.addEventListener("keydown", (e) => onEditorKey(e, input, typed, h));
  input.addEventListener("blur", () => h.end(true, false));
  return { input, typed };
}

/** Editor keydown: stop propagation of editing keys only; Ctrl/Meta shortcuts pass through. */
function onEditorKey(e: KeyboardEvent, input: HTMLTextAreaElement, typed: boolean, h: EditorHandlers): void {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); e.stopPropagation(); h.commitAll(); return; }
  if (e.ctrlKey || e.metaKey) return;
  e.stopPropagation();
  const m = MOVES[e.key];
  if (e.key === "Escape") { e.preventDefault(); h.end(false, true); }
  else if (e.key === "Enter" && e.altKey) { e.preventDefault(); input.setRangeText("\n", input.selectionStart, input.selectionEnd, "end"); }
  else if (e.key === "F4") { e.preventDefault(); cycleRefIn(input); }
  else if (e.key === "Enter" || e.key === "Tab") {
    e.preventDefault();
    h.end(true, true);
    h.move(e.key === "Tab" ? (e.shiftKey ? -1 : 1) : 0, e.key === "Enter" ? (e.shiftKey ? -1 : 1) : 0);
  } else if (m && typed && !input.value.includes("\n")) { e.preventDefault(); h.end(true, true); h.move(m[0], m[1]); }
}
