/** Keyboard handling of the grid (navigation, edit start, clear, Ctrl+D/R fill). */
import type { FillDir } from "./fill";

const MOVES: Record<string, [number, number]> = {
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
};

/** What the key handler needs from the grid. */
export interface KeyHooks {
  /** True while the inline editor is open (it handles its own keys). */
  busy(): boolean;
  move(dc: number, dr: number, extend?: boolean, jump?: boolean): void;
  startEdit(initial?: string): void;
  /** Clear the selected cells. */
  clear(): void;
  /** Ctrl+D / Ctrl+R fill of the selection. */
  fill(dir: FillDir): void;
}

/** Wire the keydown listener on `root`. */
export function bindKeys(root: HTMLElement, h: KeyHooks): void {
  root.addEventListener("keydown", (e) => {
    if (h.busy()) return;
    const mod = e.ctrlKey || e.metaKey;
    const m = MOVES[e.key];
    if (m) { e.preventDefault(); h.move(m[0], m[1], e.shiftKey, mod); }
    else if (mod && !e.altKey && (e.key === "d" || e.key === "r")) { e.preventDefault(); h.fill(e.key === "d" ? "down" : "right"); }
    else if (e.key === "Tab") { e.preventDefault(); h.move(e.shiftKey ? -1 : 1, 0); }
    else if (e.key === "Enter" || e.key === "F2") { // Enter/F2 edit; Shift+Enter moves up; Ctrl/Alt ignored
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      if (e.shiftKey && e.key === "Enter") h.move(0, -1); else h.startEdit();
    }
    else if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); h.clear(); }
    else if (e.key.length === 1 && !mod && !e.altKey) { e.preventDefault(); h.startEdit(e.key); }
  });
}
