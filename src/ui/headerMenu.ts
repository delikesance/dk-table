/**
 * Context menu of the column/row headers (Google Sheets-like): right-click selects the whole column/row
 * unless it is already part of a whole-line selection, then offers structure, sort, freeze and clear entries.
 */
import { colName, parseKey } from "./grid/keys";
import { freezeEntries } from "./freeze/freezeMenu";
import type { MenuItem } from "./contextmenu/contextmenu";
import type { App } from "./appTypes";

/** Label of the auto-fit entry (shared with the cell menu and the palette). */
export const FIT_LABEL = "Ajuster à la largeur du contenu";

/** Select the whole column (`col`) or row (`row`) `i` unless the current selection already covers it whole. */
function ensureLine(app: App, axis: "col" | "row", i: number): void {
  const { cols, rows } = app.activeDoc();
  const [a, b = a] = app.selection().split(":").map(parseKey);
  const inside = axis === "col"
    ? a.row === 0 && b.row === rows - 1 && i >= a.col && i <= b.col
    : a.col === 0 && b.col === cols - 1 && i >= a.row && i <= b.row;
  if (!inside) app.select(axis === "col" ? `${colName(i)}1:${colName(i)}${rows}` : `A${i + 1}:${colName(cols - 1)}${i + 1}`);
}

/** Menu items for a right-click on `target`, or null when it is not a column/row header. */
export function headerMenu(app: App, target: Element): MenuItem[] | null {
  const h = target.closest<HTMLElement>(".dkg-colh, .dkg-rowh");
  if (!h) return null;
  const isCol = h.classList.contains("dkg-colh");
  ensureLine(app, isCol ? "col" : "row", Number(isCol ? h.dataset.col : h.dataset.row));
  const sep: MenuItem = { separator: true };
  const structure: MenuItem[] = isCol
    ? [{ label: "Insérer une colonne à gauche", action: () => app.insertCols() }, { label: "Supprimer les colonnes", action: () => app.deleteCols() }]
    : [{ label: "Insérer une ligne au-dessus", shortcut: "Ctrl+Maj+=", action: () => app.insertRows() },
      { label: "Supprimer les lignes", shortcut: "Ctrl+-", action: () => app.deleteRows() }];
  const sort: MenuItem[] = isCol ? [sep,
    { label: "Trier A→Z", icon: "sort-asc", action: () => void app.sortColumn(false) },
    { label: "Trier Z→A", icon: "sort-desc", action: () => void app.sortColumn(true) }] : [];
  const freeze = freezeEntries(app, isCol ? "cols" : "rows").map((e) => ({ label: e.label, action: e.run }));
  const fit: MenuItem = { label: FIT_LABEL, action: () => app.fitColumns() };
  return [...structure, ...sort, ...(isCol ? [fit] : []), sep, ...freeze, sep,
    { label: "Effacer le contenu", danger: true, action: () => app.editMany(Object.fromEntries(app.selectedKeys().map((k) => [k, ""]))) }];
}
