/**
 * Floating mini-bar shown next to the current selection (quick formatting actions).
 * Pure placement logic (`placeFloating`) + a small DOM component (`createFloatingBar`).
 * Actions are reported through an injected `onAction(id)` callback; no app coupling.
 */
import { icon } from "../icons";
import "./floating.css";

/** Ids of the actions offered by the bar. */
export type FloatingActionId = "bold" | "italic" | "fill" | "text" | "percent" | "sum";

/** Rectangle in viewport coordinates (px). */
export interface Rect { top: number; left: number; width: number; height: number }
/** Size of the floating bar (px). */
export interface Size { width: number; height: number }
/** Result of {@link placeFloating}. */
export interface Placement { top: number; left: number; placement: "above" | "below" }

/** Minimum gap (px) between bar, selection and viewport edges. */
export const MARGIN = 8;

/** Order, French label and optional icon name (text label fallback when no icon exists). */
const ACTIONS: { id: FloatingActionId; label: string; icon?: string; text?: string }[] = [
  { id: "bold", label: "Gras", icon: "bold" },
  { id: "italic", label: "Italique", icon: "italic" },
  { id: "fill", label: "Couleur de fond", icon: "fill" },
  { id: "text", label: "Couleur du texte", icon: "text-color" },
  { id: "percent", label: "Format pourcentage", icon: "percent" },
  { id: "sum", label: "Somme rapide", icon: "sum" },
];

/**
 * Computes the bar position: above the selection by default, below when there is
 * no room above; horizontally centred on the selection and clamped to the viewport.
 */
export function placeFloating(sel: Rect, bar: Size, vp: Size): Placement {
  const aboveTop = sel.top - bar.height - MARGIN;
  const above = aboveTop >= MARGIN;
  const rawTop = above ? aboveTop : sel.top + sel.height + MARGIN;
  const maxTop = Math.max(MARGIN, vp.height - bar.height - MARGIN);
  const top = Math.min(Math.max(rawTop, MARGIN), maxTop);
  const centred = sel.left + sel.width / 2 - bar.width / 2;
  const maxLeft = Math.max(MARGIN, vp.width - bar.width - MARGIN);
  const left = Math.min(Math.max(centred, MARGIN), maxLeft);
  return { top, left, placement: above ? "above" : "below" };
}

/** Handle returned by {@link createFloatingBar}. */
export interface FloatingBar {
  /** Root element of the bar (host for popovers). */
  el: HTMLElement;
  /** Shows the bar next to `rect` (viewport coords). */
  show(rect: Rect): void;
  /** Hides the bar. */
  hide(): void;
  /** Sets `aria-pressed` of an action button. */
  setPressed(id: FloatingActionId, on: boolean): void;
  /** Enables/disables an action button. */
  setDisabled(id: FloatingActionId, off: boolean): void;
}

/** Builds the bar inside `root` (hidden at first); clicks call `onAction(id)`. */
export function createFloatingBar(root: HTMLElement, onAction: (id: FloatingActionId) => void): FloatingBar {
  const el = document.createElement("div");
  el.className = "dk-floating";
  el.setAttribute("role", "toolbar");
  el.setAttribute("aria-label", "Mise en forme rapide");
  el.hidden = true;
  const buttons = new Map<FloatingActionId, HTMLButtonElement>();
  for (const a of ACTIONS) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "dk-floating__btn";
    b.dataset.action = a.id;
    b.title = a.label;
    b.setAttribute("aria-label", a.label);
    b.setAttribute("aria-pressed", "false");
    if (a.icon) b.innerHTML = icon(a.icon);
    if (!b.innerHTML) b.textContent = a.text ?? a.label;
    // Keep the grid selection/focus: do not steal focus on mouse press.
    b.addEventListener("mousedown", (e) => e.preventDefault());
    b.addEventListener("click", () => onAction(a.id));
    buttons.set(a.id, b);
    el.appendChild(b);
  }
  root.appendChild(el);
  return {
    el,
    show(rect) {
      el.hidden = false;
      const size = { width: el.offsetWidth || 220, height: el.offsetHeight || 40 };
      const p = placeFloating(rect, size, { width: window.innerWidth, height: window.innerHeight });
      el.style.top = `${p.top}px`;
      el.style.left = `${p.left}px`;
      el.dataset.placement = p.placement;
    },
    hide() { el.hidden = true; },
    setPressed(id, on) {
      const b = buttons.get(id);
      if (b) { b.setAttribute("aria-pressed", String(on)); b.classList.toggle("dk-floating__btn--active", on); }
    },
    setDisabled(id, off) { const b = buttons.get(id); if (b) b.disabled = off; },
  };
}
