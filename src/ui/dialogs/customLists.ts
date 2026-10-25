/**
 * Listes personnalisées (Paramètres > Listes personnalisées…): ajout d'une suite de textes (ex. Bas, Moyen, Haut)
 * utilisée par le tri et la poignée de recopie. Saisie: un élément par ligne, ou séparé par virgule / point-virgule.
 * Un refus (vide, doublon, liste déjà existante) est affiché sous le formulaire; rien n'est enregistré.
 * Chaque liste a un bouton « Supprimer ».
 */
import { openDialog } from "./dialog";
import { parseListText } from "../../engine/custom-lists";
import { customLists as appLists, type CustomLists } from "../../io/customLists";

/** Ouvre la boîte (une seule instance) sur les listes `store` (par défaut celles de l'application). */
export function openCustomLists(store: CustomLists = appLists): void {
  const body = document.createElement("div");
  body.className = "dk-dialog__body";
  body.innerHTML =
    '<p class="dk-dialog__hint">Un élément par ligne, ou séparés par des virgules. Au moins 2 éléments, sans doublon.</p>' +
    '<div data-role="lists" class="dk-dialog__lists"></div>' +
    '<textarea name="items" rows="4" aria-label="Éléments de la liste" placeholder="Bas&#10;Moyen&#10;Haut"></textarea>' +
    '<p role="alert" class="dk-dialog__error"></p>' +
    '<button type="button" class="dk-dialog__btn" data-action="add">Ajouter la liste</button>';
  const area = body.querySelector<HTMLTextAreaElement>('textarea[name="items"]')!;
  const err = body.querySelector<HTMLElement>('[role="alert"]')!;
  const shown = body.querySelector<HTMLElement>('[data-role="lists"]')!;

  /** Affiche les listes enregistrées (texte seul, pas de HTML saisi), chacune avec son bouton Supprimer. */
  const render = (): void => {
    shown.replaceChildren(...store.lists().map((l, i) => {
      const p = document.createElement("p");
      const del = document.createElement("button");
      del.type = "button";
      del.className = "dk-dialog__btn";
      del.dataset.action = "remove";
      del.dataset.index = String(i);
      del.textContent = "Supprimer";
      del.setAttribute("aria-label", `Supprimer ${l.join(", ")}`);
      del.addEventListener("click", () => { store.remove(i); render(); });
      p.append(l.join(", "), " ", del);
      return p;
    }));
  };
  body.querySelector<HTMLButtonElement>('[data-action="add"]')!.addEventListener("click", () => {
    const r = store.add(parseListText(area.value));
    if (!r.ok) { err.textContent = r.reason; return; }
    err.textContent = "";
    area.value = "";
    render();
  });
  render();
  openDialog("customLists", "Listes personnalisées", body);
}
