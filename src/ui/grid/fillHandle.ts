/**
 * Poignée de recopie (cran carré du coin bas-droit de la sélection, classe `dkg-h`): glisser prolonge la
 * série vers le bas / le haut / la droite / la gauche avec aperçu (zone teintée + dernière valeur près
 * du pointeur); relâcher écrit, Ctrl inverse série / recopie; double-clic descend jusqu'à la fin des
 * données voisines. Calculs: `seriesFill.ts`. Écoute en capture pour passer avant la sélection à la souris.
 */
import { keyOf, parseKey, type Pos } from "./keys";
import type { Sel } from "./nav";
import { autoFillEnd, seriesPlan, type SeriesPlan } from "./seriesFill";
import "./fillHandle.css";

/** Liens avec la grille. */
export interface FillHandleHooks {
  cols: number;
  rows: number;
  sel(): Sel;
  getRaw(key: string): string;
  /** Vrai pendant l'édition d'une cellule: pas de poignée. */
  busy(): boolean;
  /** Écrit la recopie (une édition par cellule) et applique la nouvelle sélection. */
  apply(p: SeriesPlan): void;
}

/** Zone cliquable de la poignée: coin bas-droit de la cellule, en px. */
const HIT = 10;

/** Vrai si le pointeur de `e` est sur la poignée de la cellule `dkg-h`. */
function onHandle(e: MouseEvent): boolean {
  const cell = (e.target as HTMLElement | null)?.closest?.<HTMLElement>(".dkg-h");
  if (!cell) return false;
  const r = cell.getBoundingClientRect();
  if (!r.width) return false; // not laid out (jsdom)
  return e.clientX >= r.right - HIT && e.clientX <= r.right + 4 && e.clientY >= r.bottom - HIT && e.clientY <= r.bottom + 4;
}

/** Branche la poignée sur `root`; renvoie le nettoyage (écouteur du document). */
export function bindFillHandle(root: HTMLElement, h: FillHandleHooks): () => void {
  let drag: { target: Pos | null } | null = null;
  let shown: HTMLElement[] = [];
  const tip = document.createElement("div");
  tip.className = "dkg-fill-tip";

  const clearPreview = (): void => {
    shown.forEach((el) => el.classList.remove("dkg-fp", "dkg-fp-t", "dkg-fp-b", "dkg-fp-l", "dkg-fp-r"));
    shown = [];
    tip.remove();
  };
  const plan = (target: Pos, ctrl: boolean): SeriesPlan => {
    const { anchor, active } = h.sel();
    return seriesPlan(anchor, active, target, h.getRaw, ctrl, { cols: h.cols, rows: h.rows });
  };
  /** Aperçu: teinte + contour de la zone à remplir, dernière valeur près du pointeur. */
  const preview = (p: SeriesPlan, e: MouseEvent): void => {
    clearPreview();
    const keys = Object.keys(p.plan);
    if (!keys.length) return;
    const ps = keys.map(parseKey);
    const [c0, c1] = [Math.min(...ps.map((q) => q.col)), Math.max(...ps.map((q) => q.col))];
    const [r0, r1] = [Math.min(...ps.map((q) => q.row)), Math.max(...ps.map((q) => q.row))];
    for (const q of ps) {
      const el = root.querySelector<HTMLElement>(`[data-key="${keyOf(q.col, q.row)}"]`);
      if (!el) continue;
      el.classList.add("dkg-fp");
      if (q.row === r0) el.classList.add("dkg-fp-t");
      if (q.row === r1) el.classList.add("dkg-fp-b");
      if (q.col === c0) el.classList.add("dkg-fp-l");
      if (q.col === c1) el.classList.add("dkg-fp-r");
      shown.push(el);
    }
    const lastKey = keys[keys.length - 1];
    tip.textContent = p.plan[lastKey] || "·";
    tip.style.left = `${e.clientX + 14}px`;
    tip.style.top = `${e.clientY + 14}px`;
    document.body.appendChild(tip);
  };

  root.addEventListener("mousedown", (e) => {
    if (e.button !== 0 || h.busy() || !onHandle(e)) return;
    e.preventDefault();
    e.stopPropagation();
    drag = { target: null };
  }, true);
  /** Cell under the pointer, seen through overlays (floating toolbar): jsdom has no elementsFromPoint, the event target stands in. */
  const cellAt = (e: MouseEvent): HTMLElement | null => {
    const stack = document.elementsFromPoint?.(e.clientX, e.clientY) ?? [e.target as Element];
    const el = stack.find((x) => x.classList?.contains("dkg-cell") && root.contains(x));
    return (el as HTMLElement) ?? null;
  };
  const onMove = (e: MouseEvent): void => {
    const el = drag && cellAt(e);
    if (!drag || !el) return;
    drag.target = parseKey(el.dataset.key!);
    preview(plan(drag.target, e.ctrlKey || e.metaKey), e);
  };
  document.addEventListener("mousemove", onMove);
  root.addEventListener("dblclick", (e) => {
    if (h.busy() || !onHandle(e)) return;
    e.stopPropagation(); // pas d'édition de cellule
    const { anchor, active } = h.sel();
    const end = autoFillEnd(anchor, active, h.getRaw, h.rows, h.cols);
    if (end !== null) h.apply(plan({ col: Math.min(anchor.col, active.col), row: end }, e.ctrlKey || e.metaKey));
  }, true);
  const onUp = (e: MouseEvent): void => {
    if (!drag) return;
    const { target } = drag;
    drag = null;
    clearPreview();
    if (target) h.apply(plan(target, e.ctrlKey || e.metaKey)); // Ctrl se lit au relâchement
  };
  document.addEventListener("mouseup", onUp);
  return () => { document.removeEventListener("mouseup", onUp); document.removeEventListener("mousemove", onMove); clearPreview(); };
}
