/**
 * Keyboard handling of the grid: arrows (Ctrl = data-block jump, Shift = extend), Home, Ctrl+Home/End,
 * PageUp/Down, Ctrl+A, Ctrl/Shift+Space, Ctrl+PageUp/Down (sheets), Tab, Enter/F2, Delete, Ctrl+D/R.
 * Ignored while the inline editor is open (it handles its own keys) or when a text field inside the grid has focus.
 */
import type { FillDir } from "./fill";
import type { NavAction } from "./nav";

const MOVES: Record<string, [number, number]> = {
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
};

/** What the key handler needs from the grid. */
export interface KeyHooks {
  /** True while the inline editor is open (it handles its own keys). */
  busy(): boolean;
  /** Apply a navigation action (see nav.ts); `extend` keeps the anchor. */
  nav(a: NavAction, extend: boolean): void;
  startEdit(initial?: string): void;
  /** Clear the selected cells. */
  clear(): void;
  /** Ctrl+D / Ctrl+R fill of the selection. */
  fill(dir: FillDir): void;
  /** Ctrl+PageUp (-1) / Ctrl+PageDown (+1): switch sheet. */
  sheet(dir: -1 | 1): void;
}

/** Navigation action of a key without/with Ctrl, or undefined. */
function navOf(e: KeyboardEvent, mod: boolean): NavAction | undefined {
  const m = MOVES[e.key];
  if (m) return { kind: "move", dc: m[0], dr: m[1], jump: mod };
  if (e.key === "Home") return { kind: mod ? "top" : "home" };
  if (e.key === "End" && mod) return { kind: "end" };
  if (e.key === "PageUp" || e.key === "PageDown") return mod ? undefined : { kind: e.key === "PageUp" ? "pageUp" : "pageDown" };
  if (mod && !e.altKey && (e.key === "a" || e.key === "A")) return { kind: "all" };
  if (e.key === " " && mod) return { kind: "cols" };
  if (e.key === " " && e.shiftKey) return { kind: "rows" };
  return undefined;
}

/** True for an editable text field other than the grid itself. */
const isField = (t: EventTarget | null, root: HTMLElement): boolean =>
  t !== root && t instanceof HTMLElement && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);

/** Wire the keydown listener on `root`. */
export function bindKeys(root: HTMLElement, h: KeyHooks): void {
  root.addEventListener("keydown", (e) => {
    if (h.busy() || isField(e.target, root)) return;
    const mod = e.ctrlKey || e.metaKey;
    const nav = navOf(e, mod);
    if (nav) { e.preventDefault(); h.nav(nav, e.shiftKey); }
    else if (mod && (e.key === "PageUp" || e.key === "PageDown")) { e.preventDefault(); h.sheet(e.key === "PageUp" ? -1 : 1); }
    else if (mod && !e.altKey && (e.key === "d" || e.key === "r")) { e.preventDefault(); h.fill(e.key === "d" ? "down" : "right"); }
    else if (e.key === "Tab") { e.preventDefault(); h.nav({ kind: "move", dc: e.shiftKey ? -1 : 1, dr: 0 }, false); }
    else if (e.key === "Enter" || e.key === "F2") { // Enter/F2 edit; Shift+Enter moves up; Ctrl/Alt ignored
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      if (e.shiftKey && e.key === "Enter") h.nav({ kind: "move", dc: 0, dr: -1 }, false); else h.startEdit();
    }
    else if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); h.clear(); }
    else if (e.key.length === 1 && !mod && !e.altKey) { e.preventDefault(); h.startEdit(e.key); }
  });
}
