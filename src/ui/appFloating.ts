/**
 * Wires the floating mini-bar to the app: shown above a multi-cell selection,
 * hidden for a single cell and while a cell is being edited; pressed states follow the active style.
 * Refreshes are driven by `toolbar.setState` (called by `syncInfo` on every selection/edit change)
 * plus grid keyboard/mouse events that start or end an edit.
 */
import { createFloatingBar, type FloatingActionId, type Rect } from "./toolbar/floating";
import { createColorPicker, type ColorPicker } from "./toolbar/colors";
import { autosum } from "./autosum";
import type { Ctx } from "./appState";
import type { App } from "./appTypes";

/** Runs a floating-bar action on the current selection. */
export function floatingAction(app: App, id: FloatingActionId): void {
  const st = app.activeStyle();
  if (id === "bold") app.style({ bold: !st.bold });
  else if (id === "italic") app.style({ italic: !st.italic });
  else if (id === "sum") autosum(app);
  else if (id === "percent") app.style({ format: st.format === "percent" ? "general" : "percent" });
}

/** Union of the selected cells' viewport rects, or null if none is rendered. */
function selectionRect(host: HTMLElement): Rect | null {
  const els = host.querySelectorAll<HTMLElement>(".dkg-range, .dkg-active");
  let r: { t: number; l: number; b: number; r: number } | null = null;
  els.forEach((e) => {
    const x = e.getBoundingClientRect();
    r = r ? { t: Math.min(r.t, x.top), l: Math.min(r.l, x.left), b: Math.max(r.b, x.bottom), r: Math.max(r.r, x.right) }
      : { t: x.top, l: x.left, b: x.bottom, r: x.right };
  });
  const u = r as { t: number; l: number; b: number; r: number } | null;
  return u && { top: u.t, left: u.l, width: u.r - u.l, height: u.b - u.t };
}

/** Create the floating bar in `root` and keep it in sync with the grid selection of `c`. */
export function installFloating(c: Ctx, root: HTMLElement, onAction: (id: FloatingActionId) => void): void {
  const pickers = new Map<FloatingActionId, ColorPicker>();
  /** Opens/closes the popover of a colour action (text); other popovers close. */
  const togglePicker = (id: FloatingActionId): void => {
    pickers.forEach((p, k) => { p.hidden = k === id ? !p.hidden : true; });
  };
  const fb = createFloatingBar(root, (id) => (pickers.has(id) ? togglePicker(id) : onAction(id)));
  const addPicker = (id: "fill" | "text", apply: (col: string | null) => void): void => {
    const p = createColorPicker({ kind: id, root: fb.el, onPick: (col) => { p.hidden = true; apply(col); } });
    p.hidden = true; pickers.set(id, p);
  };
  addPicker("fill", (col) => c.app.style({ fill: col ?? undefined }));
  addPicker("text", (col) => c.app.style({ color: col ?? undefined }));
  const refresh = (): void => {
    if (!c.grid) return;
    const multi = c.grid.getSelection().includes(":");
    const editing = !!c.gridHost.querySelector(".dkg input");
    const rect = multi && !editing ? selectionRect(c.gridHost) : null;
    if (!rect) { pickers.forEach((p) => { p.hidden = true; }); fb.hide(); return; }
    const st = c.app.activeStyle();
    fb.setPressed("bold", !!st.bold); fb.setPressed("italic", !!st.italic);
    fb.setPressed("fill", !!st.fill); fb.setPressed("percent", st.format === "percent");
    fb.show(rect);
  };
  const orig = c.toolbar.setState.bind(c.toolbar);
  c.toolbar.setState = (s) => { orig(s); refresh(); };
  // Edit start/end do not go through syncInfo: re-evaluate after the grid handled the event.
  for (const ev of ["keydown", "dblclick", "focusout"]) c.gridHost.addEventListener(ev, () => queueMicrotask(refresh));
  c.gridHost.addEventListener("scroll", refresh, true);
}
