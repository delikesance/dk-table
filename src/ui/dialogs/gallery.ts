/**
 * Vue Galerie (palette « Vue Galerie… ») : une carte par ligne de la feuille active (titre = 1re colonne),
 * avec les champs cochés. Un clic sur une carte sélectionne la ligne dans la grille. La grille de cartes
 * s'adapte à la largeur (CSS grid auto-fill). Les lignes masquées par le filtre de la grille restent masquées.
 */
import { openDialog } from "./dialog";
import { gridOf } from "./pivot";
import { galleryCards } from "../../engine/gallery";
import { makeKey } from "../../engine/address";
import type { App } from "../appTypes";
import "./views.css";

/** Ouvre la vue (une seule instance). */
export function openGallery(app: Pick<App, "activeDoc" | "select" | "rowHidden">): void {
  const body = document.createElement("div");
  body.className = "dk-dialog__body dk-views dk-gallery";
  const grid = gridOf(app.activeDoc().cells);
  if (grid.length < 2) {
    body.innerHTML = '<p class="dk-dialog__hint">La première ligne doit contenir les en-têtes et au moins une ligne de données.</p>';
    openDialog("gallery", "Vue Galerie", body);
    return;
  }
  const chosen = new Set<number>();
  grid[0].forEach((h, c) => { if (c > 0 && h !== "") chosen.add(c); });
  const bar = document.createElement("div");
  bar.className = "dk-views__bar";
  bar.append("Champs ");
  for (const c of chosen) {
    const label = document.createElement("label");
    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = true;
    box.dataset.field = String(c);
    box.addEventListener("change", () => { if (box.checked) chosen.add(c); else chosen.delete(c); render(); });
    label.append(box, ` ${grid[0][c]} `);
    bar.append(label);
  }
  const cards = document.createElement("div");
  cards.className = "dk-gallery__cards";
  body.append(bar, cards);

  function render(): void {
    const data = gridOf(app.activeDoc().cells);
    const list = galleryCards(data, [...chosen], (r) => app.rowHidden(r));
    cards.replaceChildren(...list.map((card) => {
      const el = document.createElement("article");
      el.className = "dk-views__card";
      el.dataset.card = String(card.row);
      el.tabIndex = 0;
      const h = document.createElement("strong");
      h.textContent = card.title || makeKey(1, card.row);
      el.append(h);
      for (const f of card.fields) {
        const p = document.createElement("p");
        p.textContent = `${f.name} : ${f.value}`;
        el.append(p);
      }
      const open = (): void => app.select(makeKey(1, card.row));
      el.addEventListener("click", open);
      el.addEventListener("keydown", (e) => { if (e.key === "Enter") open(); });
      return el;
    }));
    if (!list.length) cards.textContent = "Aucune ligne.";
  }
  render();
  openDialog("gallery", "Vue Galerie", body);
}
