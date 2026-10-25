/**
 * Données > Valeur cible… : trouve la valeur de la cellule variable pour que la cellule formule atteigne la
 * valeur cible (`engine/goalSeek`). La recherche tourne sur une COPIE de la feuille active : rien n'est écrit
 * tant que « Appliquer » n'est pas cliqué (écriture annulable via `app.edit`). Échec = message, aucune écriture.
 * Limite : les références vers d'autres feuilles ne sont pas résolues dans la copie.
 */
import { openDialog } from "./dialog";
import { goalSeek } from "../../engine/goalSeek";
import { createSheet, setCell } from "../../engine/sheet";
import type { App } from "../appTypes";
import "./form.css";

/** Ouvre la boîte (une seule instance) : trois champs, « Rechercher », puis « Appliquer ». */
export function openGoalSeek(app: Pick<App, "activeDoc" | "edit">): void {
  const body = document.createElement("div");
  body.className = "dk-dialog__body dk-goal";
  body.innerHTML =
    '<label>Cellule à définir (formule) <input name="formula" placeholder="B1"></label>' +
    '<label>Valeur cible <input name="target" placeholder="0" inputmode="decimal"></label>' +
    '<label>Cellule variable (constante) <input name="variable" placeholder="A1"></label>' +
    '<p class="dk-dialog__error" role="alert"></p><p class="dk-form__status" role="status"></p>' +
    '<button type="button" class="dk-dialog__btn" data-action="seek">Rechercher</button> ' +
    '<button type="button" class="dk-dialog__btn" data-action="apply" hidden>Appliquer</button>';
  const input = (n: string): HTMLInputElement => body.querySelector<HTMLInputElement>(`input[name="${n}"]`)!;
  const err = body.querySelector<HTMLElement>('[role="alert"]')!;
  const status = body.querySelector<HTMLElement>('[role="status"]')!;
  const apply = body.querySelector<HTMLButtonElement>('[data-action="apply"]')!;
  let found: { key: string; value: number } | null = null;

  body.querySelector('[data-action="seek"]')!.addEventListener("click", () => {
    found = null;
    apply.hidden = true;
    err.textContent = status.textContent = "";
    const target = Number(input("target").value.trim().replace(",", "."));
    if (input("target").value.trim() === "" || !Number.isFinite(target)) { err.textContent = "La valeur cible doit être un nombre."; return; }
    const sheet = createSheet();
    for (const [k, c] of Object.entries(app.activeDoc().cells)) setCell(sheet, k, c.raw);
    const varKey = input("variable").value.trim().toUpperCase();
    const r = goalSeek(sheet, input("formula").value.trim(), varKey, target);
    if (!r.ok) { err.textContent = r.message; return; }
    found = { key: varKey, value: r.value };
    status.textContent = `${varKey} = ${r.value} (actuellement ${r.original})`;
    apply.hidden = false;
  });
  apply.addEventListener("click", () => {
    if (!found) return;
    app.edit(found.key, String(found.value));
    status.textContent = `${found.key} = ${found.value} appliqué`;
    apply.hidden = true;
    found = null;
  });
  openDialog("goalseek", "Valeur cible", body);
}
