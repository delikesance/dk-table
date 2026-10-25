/**
 * Ctrl+G « Atteindre spécial » : choix de la cible (cellules vides, formules, constantes), des types de résultat
 * et du filtre « visibles seulement ». OK sélectionne via `app.goSpecial`; sans résultat, la boîte reste ouverte.
 */
import "../special.css";
import { openDialog } from "./dialog";
import type { App } from "../appTypes";
import type { SpecialKind, SpecialType } from "../../engine/special";

const KINDS: [SpecialKind, string][] = [["blanks", "Cellules vides"], ["formulas", "Formules"], ["constants", "Constantes"]];
const TYPES: [SpecialType, string][] = [["number", "Nombres"], ["text", "Texte"], ["logical", "Logique"], ["error", "Erreurs"]];

/** Ouvre la boîte (une seule instance) ; OK lance la sélection sur la feuille active. */
export function openGoToSpecial(app: App): void {
  const body = document.createElement("form");
  body.className = "dk-special";
  body.innerHTML = `
    <fieldset>${KINDS.map(([v, l], i) => `<label><input type="radio" name="kind" value="${v}"${i ? "" : " checked"}> ${l}</label>`).join("")}</fieldset>
    <fieldset class="dk-special__types"><legend>Type de résultat</legend>${TYPES.map(([v, l]) => `<label><input type="checkbox" name="types" value="${v}" checked> ${l}</label>`).join("")}</fieldset>
    <label><input type="checkbox" name="visible"> Cellules visibles seulement</label>
    <p class="dk-special__msg" role="status"></p>
    <button type="submit" class="dk-dialog__btn dk-special__go">OK</button>`;
  const box = openDialog("special", "Atteindre spécial", body);
  // les types ne s'appliquent ni aux cellules vides ni hors formules/constantes : désactivés pour « vides »
  body.addEventListener("change", () => {
    const blank = body.querySelector<HTMLInputElement>('input[name="kind"]:checked')!.value === "blanks";
    body.querySelectorAll<HTMLInputElement>('input[name="types"]').forEach((i) => { i.disabled = blank; });
  });
  body.addEventListener("submit", (e) => {
    e.preventDefault();
    const kind = body.querySelector<HTMLInputElement>('input[name="kind"]:checked')!.value as SpecialKind;
    const types = [...body.querySelectorAll<HTMLInputElement>('input[name="types"]:checked')].map((i) => i.value as SpecialType);
    const visibleOnly = body.querySelector<HTMLInputElement>('input[name="visible"]')!.checked;
    const found = app.goSpecial({ kind, types: kind === "blanks" ? undefined : types, visibleOnly });
    if (found) box.querySelector<HTMLElement>('[data-action="close"]')!.click();
    else body.querySelector<HTMLElement>(".dk-special__msg")!.textContent = "Aucune cellule trouvée.";
  });
}
