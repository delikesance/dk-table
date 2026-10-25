/**
 * Contrôleur du plan dans la grille: pose les +/- sur les en-têtes de ligne et les boutons de niveaux
 * dans le coin, et applique les clics à `GridView.outline` (état par feuille). `changed` relance le masque.
 */
import { collapse, expand, showLevel, type Outline } from "../../engine/outline";
import { addLevelButtons, foldState, hasOutline, setFoldButton } from "./outlineView";
import type { GridView } from "./types";

/** Contrôleur exposé à la grille. */
export interface OutlineCtl {
  /** Pose le +/- de la ligne `row` (si elle est rendue). */
  decorate(row: number): void;
  /** Recalcule tous les +/- et l'affichage des boutons de niveaux. */
  refresh(): void;
}

/** Branche le plan sur la grille: `heads` donne les en-têtes de ligne rendus. */
export function createOutlineCtl(root: HTMLElement, heads: () => Map<number, HTMLElement>, view: GridView, changed: () => void): OutlineCtl {
  const corner = root.querySelector<HTMLElement>(".dkg-corner")!;
  const lvls = addLevelButtons(corner, (k) => {
    if (view.outline) apply(showLevel(view.outline, k - 1));
  });
  const toggle = (row: number): void => {
    const o: Outline | undefined = view.outline;
    if (o) apply(foldState(o, row) === "closed" ? expand(o, row) : collapse(o, row));
  };
  const decorate = (row: number): void => {
    const head = heads().get(row);
    if (head) setFoldButton(head, row, view.outline ? foldState(view.outline, row) : null, () => toggle(row));
  };
  /** Store the new outline, redraw the buttons, then let the grid re-list its rows. */
  const apply = (o: Outline): void => {
    view.outline = o;
    refresh();
    changed();
  };
  const refresh = (): void => {
    heads().forEach((_, row) => decorate(row));
    const on = hasOutline(view.outline);
    lvls.forEach((b) => { b.hidden = !on; });
  };
  refresh();
  return { decorate, refresh };
}
