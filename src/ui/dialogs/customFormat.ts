/**
 * Format > Format personnalisé… : saisie d'un code (1 à 4 sections, ex. `0.0" cm"`), aperçu en direct
 * sur trois valeurs (positive, négative, zéro) et application au style de la sélection (`app.style`).
 * Le calcul est dans `ui/numfmtCustom.ts` ; ici seulement le dialogue.
 */
import { checkCustom, formatCustom } from "../numfmtCustom";
import { CUSTOM } from "../numfmt";
import { openDialog } from "./dialog";
import type { App } from "../appTypes";

/** Valeurs d'exemple de l'aperçu : positive, négative, zéro. */
const SAMPLES = ["1234.5", "-3", "0"];

/** Ouvre la boîte « Format personnalisé » (une seule instance). */
export function openCustomFormat(app: App): void {
  const body = document.createElement("div");
  body.className = "dk-dialog__body";
  body.innerHTML =
    '<label class="dk-dialog__check" style="display:block">Code :<br><input type="text" name="code" style="width:100%;margin-top:4px" placeholder="0.00 €;-0.00 €;&quot;zéro&quot;"></label>' +
    '<p class="dk-dialog__preview" aria-live="polite"></p>' +
    '<p class="dk-dialog__error" role="alert"></p>' +
    '<button type="button" class="dk-dialog__btn" data-action="apply">Appliquer</button>';
  const box = openDialog("custom-format", "Format personnalisé", body);
  const input = body.querySelector<HTMLInputElement>('input[name="code"]')!;
  const preview = body.querySelector<HTMLElement>(".dk-dialog__preview")!;
  const error = body.querySelector<HTMLElement>(".dk-dialog__error")!;
  const apply = body.querySelector<HTMLButtonElement>('[data-action="apply"]')!;

  /** Met à jour l'aperçu et l'erreur à chaque frappe ; Appliquer inactif si le code est invalide. */
  const refresh = (): void => {
    const code = input.value;
    const err = code.trim() === "" ? null : checkCustom(code);
    error.textContent = err ?? "";
    apply.disabled = err !== null || code.trim() === "";
    preview.textContent = err ? "" : SAMPLES.map((v) => formatCustom(v, code)).join(" ; ");
  };
  input.addEventListener("input", refresh);
  refresh();

  apply.addEventListener("click", () => {
    if (checkCustom(input.value) !== null) return;
    app.style({ format: CUSTOM + input.value });
    box.querySelector<HTMLElement>('[data-action="close"]')!.click();
  });
}
