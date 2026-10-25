/**
 * Vue Kanban (logique pure, sans DOM) : regroupe les lignes d'une grille de chaînes (ligne 1 = en-têtes)
 * en colonnes selon la valeur d'une colonne de statut. Les lignes sans statut vont dans « Sans statut ».
 * `moveCard` donne la cellule à écrire pour changer le statut d'une ligne.
 */
import { makeKey } from "./address";

/** Libellé de la colonne des lignes sans statut. */
export const NO_STATUS = "Sans statut";

/** Une carte = une ligne de la feuille (`row` 1-based) et son titre (cellule de la colonne titre). */
export interface KanbanCard {
  row: number;
  title: string;
}

/** Une colonne du tableau; `empty` vrai pour « Sans statut ». */
export interface KanbanColumn {
  status: string;
  empty: boolean;
  cards: KanbanCard[];
}

/**
 * Colonnes par valeur de `statusCol` (index 0-based), dans l'ordre d'apparition, « Sans statut » en dernier.
 * `hidden(row)` (row 1-based) écarte les lignes masquées par le filtre de la vue; les lignes entièrement vides aussi.
 */
export function groupByStatus(grid: string[][], statusCol: number, titleCol: number, hidden: (row: number) => boolean = () => false): KanbanColumn[] {
  const cols = new Map<string, KanbanColumn>();
  const none: KanbanColumn = { status: NO_STATUS, empty: true, cards: [] };
  for (let i = 1; i < grid.length; i++) {
    const row = i + 1;
    if (hidden(row) || grid[i].every((v) => v === "")) continue;
    const status = (grid[i][statusCol] ?? "").trim();
    const card = { row, title: grid[i][titleCol] ?? "" };
    if (status === "") { none.cards.push(card); continue; }
    if (!cols.has(status)) cols.set(status, { status, empty: false, cards: [] });
    cols.get(status)!.cards.push(card);
  }
  return none.cards.length ? [...cols.values(), none] : [...cols.values()];
}

/** Cellule à écrire pour placer la ligne `row` (1-based) dans `status`; « Sans statut » vide la cellule. */
export function moveCard(row: number, statusCol: number, status: string): Record<string, string> {
  return { [makeKey(statusCol + 1, row)]: status === NO_STATUS ? "" : status };
}
