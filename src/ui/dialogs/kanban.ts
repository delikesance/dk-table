/**
 * Vue Kanban (palette « Vue Kanban… ») : les lignes de la feuille active en colonnes selon une colonne de statut
 * (choisie dans la boîte, « Statut » par défaut). Déplacer une carte (glisser ou liste « Statut ») écrit le nouveau
 * statut dans la cellule (`app.edit`, annulable). Les lignes masquées par le filtre de la grille restent masquées.
 */
import { openDialog } from "./dialog";
import { gridOf } from "./pivot";
import { groupByStatus, moveCard, NO_STATUS } from "../../engine/kanban";
import type { App } from "../appTypes";
import { makeKey } from "../../engine/address";
import "./views.css";

/** Colonne de statut par défaut : en-tête évoquant un statut, sinon la dernière colonne nommée. */
export function defaultStatusCol(header: string[]): number {
  const i = header.findIndex((h) => /statut|status|état|etat|étape|etape|stage/i.test(h));
  if (i >= 0) return i;
  for (let c = header.length - 1; c >= 0; c--) if (header[c] !== "") return c;
  return 0;
}

/** Ouvre la vue (une seule instance). */
export function openKanban(app: Pick<App, "activeDoc" | "edit" | "rowHidden">): void {
  const body = document.createElement("div");
  body.className = "dk-dialog__body dk-views dk-kanban";
  const grid0 = gridOf(app.activeDoc().cells);
  if (grid0.length < 2 || grid0[0].length < 2) {
    body.innerHTML = '<p class="dk-dialog__hint">La première ligne doit contenir les en-têtes (titre, statut) et au moins une ligne de données.</p>';
    openDialog("kanban", "Vue Kanban", body);
    return;
  }
  let statusCol = defaultStatusCol(grid0[0]);
  const bar = document.createElement("label");
  bar.className = "dk-views__bar";
  bar.append("Colonne de statut ");
  const pick = document.createElement("select");
  pick.name = "status-col";
  grid0[0].forEach((h, c) => { if (h !== "") pick.add(new Option(h, String(c), false, c === statusCol)); });
  bar.append(pick);
  const board = document.createElement("div");
  board.className = "dk-kanban__board";
  body.append(bar, board);

  /** Écrit le statut de la ligne puis redessine. */
  const move = (row: number, status: string): void => {
    for (const [key, raw] of Object.entries(moveCard(row, statusCol, status))) app.edit(key, raw);
    render();
  };

  function render(): void {
    const grid = gridOf(app.activeDoc().cells);
    const cols = groupByStatus(grid, statusCol, 0, (r) => app.rowHidden(r));
    const names = [...cols.filter((c) => !c.empty).map((c) => c.status), NO_STATUS];
    board.replaceChildren(...cols.map((col) => {
      const el = document.createElement("section");
      el.className = "dk-kanban__col";
      el.dataset.col = col.status;
      el.innerHTML = `<h3></h3>`;
      el.querySelector("h3")!.textContent = `${col.status} (${col.cards.length})`;
      el.addEventListener("dragover", (e) => e.preventDefault());
      el.addEventListener("drop", (e) => {
        e.preventDefault();
        const row = Number(e.dataTransfer?.getData("text/plain"));
        if (row) move(row, col.status);
      });
      for (const card of col.cards) el.append(cardEl(card.row, card.title, col.status, names));
      return el;
    }));
  }

  /** Carte : titre, liste « Statut » (accessible au clavier) et glisser-déposer. */
  function cardEl(row: number, title: string, status: string, names: string[]): HTMLElement {
    const el = document.createElement("article");
    el.className = "dk-views__card";
    el.dataset.row = String(row);
    el.draggable = true;
    el.addEventListener("dragstart", (e) => e.dataTransfer?.setData("text/plain", String(row)));
    const h = document.createElement("strong");
    h.textContent = title || makeKey(1, row);
    const sel = document.createElement("select");
    sel.setAttribute("aria-label", `Statut de ${title || makeKey(1, row)}`);
    for (const n of names) sel.add(new Option(n, n, false, n === status));
    sel.addEventListener("change", () => move(row, sel.value));
    el.append(h, sel);
    return el;
  }

  pick.addEventListener("change", () => { statusCol = Number(pick.value); render(); });
  render();
  openDialog("kanban", "Vue Kanban", body);
}
