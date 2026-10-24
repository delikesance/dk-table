/** Inline cell editor: input creation and key/blur handling, decoupled from the grid state. */

const MOVES: Record<string, [number, number]> = {
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
};

/** Callbacks the editor drives. */
export interface EditorHandlers {
  /** Close the editor, committing when `commit`; `refocus` gives focus back to the grid. */
  end(commit: boolean, refocus: boolean): void;
  /** Move the cursor after a commit. */
  move(dc: number, dr: number): void;
}

/** Open state of the editor. */
export interface Editor { input: HTMLInputElement; typed: boolean }

/**
 * Create the editor input inside `el`.
 * Enter/Tab commit and move, Escape cancels, arrows commit+move only when the user typed;
 * Ctrl/Meta combos are left to bubble up to document; blur commits.
 */
export function openEditor(el: HTMLElement, value: string, typed: boolean, h: EditorHandlers): Editor {
  const input = document.createElement("input");
  input.className = "dkg-editor";
  input.value = value;
  el.replaceChildren(input);
  input.addEventListener("keydown", (e) => onEditorKey(e, typed, h));
  input.addEventListener("blur", () => h.end(true, false));
  input.focus();
  if (!typed) input.select();
  return { input, typed };
}

/** Editor keydown: stop propagation of editing keys only; Ctrl/Meta shortcuts pass through. */
function onEditorKey(e: KeyboardEvent, typed: boolean, h: EditorHandlers): void {
  if (e.ctrlKey || e.metaKey) return;
  e.stopPropagation();
  const m = MOVES[e.key];
  if (e.key === "Escape") { e.preventDefault(); h.end(false, true); }
  else if (e.key === "Enter" || e.key === "Tab") {
    e.preventDefault();
    h.end(true, true);
    h.move(e.key === "Tab" ? (e.shiftKey ? -1 : 1) : 0, e.key === "Enter" ? (e.shiftKey ? -1 : 1) : 0);
  } else if (m && typed) { e.preventDefault(); h.end(true, true); h.move(m[0], m[1]); }
}
