/**
 * Filtres de colonnes de la grille (VUE seulement: masque de lignes, aucune donnée modifiée).
 * Les filtres vivent dans `GridView.filters` (non persistés dans les fichiers); le masque est calculé
 * à l'application du filtre (pas à chaque édition: une ligne éditée ne disparaît pas sous le curseur).
 */
import { distinctValues } from "./filter";
import { addFilterButtons, openFilterPopover } from "./filterPopover";
import { rowTracks, visibleRows } from "./filterView";
import type { GridView } from "./types";

/** Contrôleur de filtre exposé à la grille. */
export interface FilterCtl {
  /** Lignes visibles (croissantes) ou null sans filtre. */
  order(): number[] | null;
  /** Ligne masquée par un filtre? */
  hidden(row: number): boolean;
  /** Position de la ligne parmi les lignes visibles (-1 si masquée). */
  index(row: number): number;
  /** Ferme le popover ouvert. */
  close(): void;
}

/** Branche les boutons de filtre sur les en-têtes; `changed` est appelé après chaque (dés)application. */
export function createFilterCtl(
  root: HTMLElement, heads: HTMLElement[], rows: number, view: GridView,
  display: (col: number, row: number) => string, changed: () => void,
): FilterCtl {
  let order: number[] | null = null;
  let pos = new Map<number, number>();
  let close = (): void => {};
  const apply = (): void => {
    order = visibleRows(view.filters, rows, display);
    pos = new Map((order ?? []).map((r, i) => [r, i]));
    root.style.gridTemplateRows = rowTracks(rows, order);
    heads.forEach((h, c) => h.classList.toggle("dkg-filtered", !!view.filters[c]));
  };
  apply();
  addFilterButtons(heads, (c, anchor) => {
    close();
    // row 0 is the header row of the filter: its value is not offered
    const column = Array.from({ length: rows - 1 }, (_, i) => display(c, i + 1));
    close = openFilterPopover({
      anchor, values: distinctValues(column),
      selected: view.filters[c] ? new Set(view.filters[c]) : null,
      onApply(sel) {
        if (sel) view.filters[c] = sel; else delete view.filters[c];
        apply();
        changed();
      },
    });
  });
  return {
    order: () => order,
    hidden: (r) => order !== null && !pos.has(r),
    index: (r) => (order ? pos.get(r) ?? -1 : r),
    close: () => close(),
  };
}
