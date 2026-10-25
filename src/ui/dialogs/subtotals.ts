/**
 * Données > Sous-totaux… : boîte qui choisit la colonne de groupe, la fonction et les colonnes à totaliser
 * de la sélection. Valider écrit le plan (`subtotalsApply.ts`), Annuler ne touche à rien,
 * Tout supprimer retire le plan appliqué. Les colonnes sont relatives à la sélection (0 = gauche).
 */
import { colToLetters } from "../../engine/range";
import { makeKey } from "../../engine/address";
import type { AggFn } from "../../engine/aggregate";
import { openDialog } from "./dialog";
import { applySubtotals, removeSubtotals, selectionBox } from "./subtotalsApply";
import type { App } from "../appTypes";

/** Fonctions proposées : code du moteur et libellé. */
const FNS: [AggFn, string][] = [["SUM", "Somme"], ["COUNT", "Nombre"], ["AVERAGE", "Moyenne"], ["MIN", "Min"], ["MAX", "Max"]];

/** Ouvre la boîte Sous-totaux (une seule instance). Sans sélection valide : rien. */
export function openSubtotals(app: App): void {
  const box = selectionBox(app.selectedKeys());
  if (!box) return;
  const raw = app.activeDoc().cells;
  const cols = Array.from({ length: box.col2 - box.col1 + 1 }, (_, i) => {
    const head = raw[makeKey(box.col1 + i, box.row1)]?.raw ?? "";
    return { rel: i, label: `${colToLetters(box.col1 + i)}${head ? ` · ${head}` : ""}` };
  });
  const body = document.createElement("div");
  body.className = "dk-dialog__body";
  body.innerHTML = '<label class="dk-dialog__check"><input type="checkbox" name="header" checked> La première ligne est un en-tête</label>' +
    '<label class="dk-dialog__check">Colonne de groupe <select name="group"></select></label>' +
    `<label class="dk-dialog__check">Fonction <select name="fn">${FNS.map(([c, l]) => `<option value="${c}">${l}</option>`).join("")}</select></label>` +
    '<fieldset class="dk-dialog__check"><legend>Colonnes à totaliser</legend><div class="dk-dialog__body" name="values"></div></fieldset>' +
    '<p class="dk-dialog__error" hidden></p>' +
    '<button type="button" class="dk-dialog__btn" data-action="apply">Valider</button>' +
    '<button type="button" class="dk-dialog__btn" data-action="remove">Tout supprimer</button>';
  const group = body.querySelector<HTMLSelectElement>('select[name="group"]')!;
  const values = body.querySelector<HTMLElement>('[name="values"]')!;
  const err = body.querySelector<HTMLElement>(".dk-dialog__error")!;
  const apply = body.querySelector<HTMLButtonElement>('[data-action="apply"]')!;
  for (const { rel, label } of cols) {
    group.add(new Option(label, String(rel)));
    const box1 = document.createElement("label");
    box1.className = "dk-dialog__check";
    box1.innerHTML = `<input type="checkbox" name="value" value="${rel}"> ${label}`;
    values.append(box1);
  }
  const picked = (): number[] => Array.from(body.querySelectorAll<HTMLInputElement>('input[name="value"]:checked'), (i) => Number(i.value));
  const refresh = (): void => { apply.disabled = picked().length === 0; };
  body.querySelectorAll<HTMLInputElement>('input[name="value"]').forEach((i) => i.addEventListener("change", refresh));
  refresh();

  const dlg = openDialog("subtotals", "Sous-totaux", body);
  const close = (): void => dlg.querySelector<HTMLElement>('[data-action="close"]')!.click();
  apply.addEventListener("click", () => {
    const msg = applySubtotals(app, {
      groups: [Number(group.value)],
      values: picked(),
      fn: body.querySelector<HTMLSelectElement>('select[name="fn"]')!.value as AggFn,
      header: body.querySelector<HTMLInputElement>('input[name="header"]')!.checked,
    });
    if (msg) { err.textContent = msg; err.hidden = false; return; }
    close();
  });
  body.querySelector('[data-action="remove"]')!.addEventListener("click", () => {
    if (!removeSubtotals(app)) { err.textContent = "Aucun sous-total sur cette feuille."; err.hidden = false; return; }
    close();
  });
}
