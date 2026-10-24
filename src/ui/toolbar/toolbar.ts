/** Formatting toolbar (undo/redo, bold/italic, align, number format, fill) plus the File/Insert menus. */
import { icon } from "../icons";
import { createColorPicker } from "./colors";
import { createMenus, type MenuHandlers } from "./menus";
import "./toolbar.css";

/** Horizontal alignment values. */
export type Align = "left" | "center" | "right";

/** Action callbacks emitted by the toolbar. */
export interface ToolbarHandlers {
  onUndo(): void; onRedo(): void; onBold(): void; onItalic(): void;
  onAlign(a: Align): void; onFormat(f: string): void; onFill(color: string | null): void;
  onOpen(): void; onSave(): void;
  /** Quick sum (Σ). */
  onSum?(): void;
  /** Optional: when all of `MenuHandlers` are given, File and Import/Export menus are shown. */
  menus?: MenuHandlers;
}

/** Toolbar reflected state. */
export interface ToolbarState {
  bold: boolean; italic: boolean; align: Align; format: string; canUndo: boolean; canRedo: boolean;
}

/** Public toolbar API. */
export interface Toolbar { el: HTMLElement; setState(s: Partial<ToolbarState>): void }

/** Number formats offered in the select (value, label). */
export const FORMATS: [string, string][] = [
  ["general", "Standard"], ["number", "Nombre"], ["percent", "Pourcentage"],
  ["currency", "Monétaire"], ["date", "Date"],
];

/** Creates a labelled icon button. */
function mkBtn(action: string, label: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement("button");
  b.type = "button"; b.className = "dk-iconbtn"; b.dataset.action = action;
  b.setAttribute("aria-label", label); b.title = label; b.innerHTML = icon(action);
  b.addEventListener("click", onClick);
  return b;
}

/** Wraps children in a `.dk-toolgroup`. */
function group(...els: HTMLElement[]): HTMLElement {
  const g = document.createElement("div");
  g.className = "dk-toolgroup"; g.setAttribute("role", "group"); g.append(...els);
  return g;
}

/** Creates a vertical separator. */
function sep(): HTMLElement {
  const s = document.createElement("div");
  s.className = "dk-toolsep"; s.setAttribute("role", "separator");
  return s;
}

/**
 * Builds the toolbar in `host`. Actions go through `h`; reflect app state
 * back with `setState`. All controls are native buttons/inputs (Tab/Enter/Space).
 */
export function createToolbar(host: HTMLElement, h: ToolbarHandlers): Toolbar {
  const el = document.createElement("div");
  el.className = "dk-toolbar"; el.setAttribute("role", "toolbar"); el.setAttribute("aria-label", "Barre d'outils");
  const aligns: Align[] = ["left", "center", "right"];
  const aLabel = { left: "Aligner à gauche", center: "Centrer", right: "Aligner à droite" };
  const alignBtns = aligns.map((a) => mkBtn(`align-${a}`, aLabel[a], () => h.onAlign(a)));
  const undo = mkBtn("undo", "Annuler (Ctrl+Z)", h.onUndo), redo = mkBtn("redo", "Rétablir (Ctrl+Y)", h.onRedo);
  const bold = mkBtn("bold", "Gras (Ctrl+B)", h.onBold), italic = mkBtn("italic", "Italique (Ctrl+I)", h.onItalic);

  const sel = document.createElement("select");
  sel.className = "dk-toolselect"; sel.setAttribute("aria-label", "Format de nombre");
  for (const [v, l] of FORMATS) sel.add(new Option(l, v));
  sel.addEventListener("change", () => h.onFormat(sel.value));

  // Fill colour: icon button + Palette popover ("Aucune" -> null clears the fill).
  const fillWrap = document.createElement("div");
  fillWrap.className = "dk-colorwrap";
  const picker = createColorPicker({ kind: "fill", root: fillWrap, onPick: (c) => { picker.hidden = true; h.onFill(c); } });
  picker.hidden = true;
  const fillBtn = mkBtn("fill", "Couleur de fond", () => { picker.hidden = !picker.hidden; });
  fillWrap.prepend(fillBtn);
  document.addEventListener("mousedown", (e) => {
    if (!picker.hidden && !fillWrap.contains(e.target as Node)) picker.hidden = true;
  });
  // Text colour: prepared only; stays disabled/hidden until CellStyle.color exists.
  const textBtn = mkBtn("text-color", "Couleur du texte", () => {});
  textBtn.disabled = true; textBtn.hidden = true;

  // N2 (File/Import menus, extras): hidden until the chevron deploys it; N1 is always visible.
  const n2 = document.createElement("div");
  n2.className = "dk-toolbar__n2"; n2.hidden = true;
  if (h.menus) n2.append(createMenus(h.menus), sep());
  el.append(
    n2,
    group(undo, redo), sep(), group(bold, italic), sep(), group(...alignBtns), sep(),
    group(sel, mkBtn("sum", "Somme rapide (Alt+=)", () => h.onSum?.())), sep(), group(fillWrap, textBtn), sep(),
    group(mkBtn("open", "Ouvrir (Ctrl+O)", h.onOpen), mkBtn("save", "Enregistrer (Ctrl+S)", h.onSave)),
  );
  host.append(el);

  /** Sets pressed state + class on a toggle button. */
  const press = (b: HTMLElement, on: boolean) => {
    b.setAttribute("aria-pressed", String(on)); b.classList.toggle("dk-iconbtn--active", on);
  };
  return {
    el,
    setState(s) {
      if (s.bold !== undefined) press(bold, s.bold);
      if (s.italic !== undefined) press(italic, s.italic);
      if (s.align) aligns.forEach((a, i) => press(alignBtns[i], a === s.align));
      if (s.format !== undefined) sel.value = s.format;
      if (s.canUndo !== undefined) undo.disabled = !s.canUndo;
      if (s.canRedo !== undefined) redo.disabled = !s.canRedo;
    },
  };
}
