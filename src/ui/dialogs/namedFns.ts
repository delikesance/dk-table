/**
 * Données > Fonctions nommées… : définir des fonctions personnalisées (nom, paramètres, corps de
 * formule), appelables dans les cellules (`=TVA(100; 0,2)`). Persistées dans le `.dktable`.
 * Logique pure : `upsertFn` ; moteur : `engine/userfnStore.ts` ; application : `App.setFunctions`.
 */
import { checkUserFn, type UserFn } from "../../engine/userfnStore";
import { openDialog } from "./dialog";
import "./namedFns.css";
import type { App } from "../appTypes";

/** Ajoute ou remplace (même nom, sans casse) la fonction ; `error` (FR) si la définition est invalide. */
export function upsertFn(list: UserFn[], f: UserFn): { list: UserFn[] } | { error: string } {
  const others = list.filter((x) => x.name.toUpperCase() !== f.name.toUpperCase());
  const error = checkUserFn(f, others.map((x) => x.name));
  if (error) return { error };
  return { list: [...others, f] };
}

/** Échappe le texte inséré en HTML. */
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

/** Ouvre la boîte (une seule instance) : liste des fonctions + formulaire d'ajout. */
export function openNamedFns(app: App): void {
  const body = document.createElement("div");
  body.className = "dk-dialog__body dk-fns";
  const render = (err = ""): void => {
    const rows = app.getFunctions().map((f, i) =>
      `<li><code>${esc(f.name)}(${esc(f.params.join("; "))})</code> <span>${esc(f.body)}</span>` +
      `<button type="button" data-action="del-fn" data-i="${i}">Supprimer</button></li>`).join("");
    body.innerHTML = `<ul class="dk-fns__list">${rows}</ul>` +
      '<label>Nom <input name="name" placeholder="TVA"></label>' +
      '<label>Paramètres (séparés par ;) <input name="params" placeholder="ht; taux"></label>' +
      '<label>Corps <input name="body" placeholder="=ht*(1+taux)"></label>' +
      `<p class="dk-fns__err" role="alert">${esc(err)}</p>` +
      '<button type="button" class="dk-dialog__btn" data-action="add-fn">Enregistrer</button>';
    if (body.isConnected) body.querySelector<HTMLInputElement>('[name="name"]')!.focus(); // Échap reste actif après un rendu
  };
  render();
  body.addEventListener("click", (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>("[data-action]");
    if (!t) return;
    const list = app.getFunctions();
    if (t.dataset.action === "del-fn") {
      app.setFunctions(list.filter((_, i) => i !== Number(t.dataset.i)));
      return render();
    }
    const v = (n: string) => body.querySelector<HTMLInputElement>(`[name="${n}"]`)!.value.trim();
    const params = v("params").split(/[;,]/).map((p) => p.trim()).filter(Boolean);
    const r = upsertFn(list, { name: v("name"), params, body: v("body") });
    if ("error" in r) return render(r.error);
    app.setFunctions(r.list);
    render();
  });
  openDialog("named-fns", "Fonctions nommées", body);
}
