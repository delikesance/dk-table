/**
 * « Validation des données » dialog (menu Données, palette): the sheet's rules (add / delete)
 * and the list of cells that currently break them, each with « Corriger » (clears the cell),
 * plus « Tout corriger ». Every change goes through the App (one undo step each).
 */
import { openDialog } from "../dialogs/dialog";
import { parseRange } from "../../engine/range";
import { ruleForm, readRule, describeVal } from "./form";
import type { App } from "../appTypes";
import "./validation.css";

/** What the dialog needs from the app. */
export type ValHost = Pick<App, "validationRules" | "setValidationRules" | "invalidCells" | "fixInvalid" | "selection">;

/** Escape text for innerHTML. */
const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

/** Open the dialog (one instance) on the active sheet of `app`. */
export function openValidationDialog(app: ValHost): void {
  const body = document.createElement("div");
  body.className = "dk-dialog__body dk-val";
  const box = openDialog("validation", "Validation des données", body);
  if (!box.contains(body)) return; // already open
  box.classList.add("dk-dialog--wide");

  /** Draw rules, form and invalid list from the current app state. */
  function render(err = ""): void {
    const rules = app.validationRules(), bad = app.invalidCells();
    const s = bad.length > 1 ? "s" : "";
    body.innerHTML = `<ul class="dk-val__rules">${rules.map((r, i) =>
      `<li><span class="dk-val__range">${esc(r.range)}</span><span class="dk-val__desc">${esc(describeVal(r))}</span>
       <button type="button" class="dk-val__btn" data-action="del" data-i="${i}">Supprimer</button></li>`).join("") || '<li class="dk-val__empty">Aucune règle.</li>'}</ul>
      ${ruleForm(app.selection())}<p class="dk-val__err" role="alert">${esc(err)}</p>
      <h3 class="dk-val__title">${bad.length} cellule${s} invalide${s}
        ${bad.length ? '<button type="button" class="dk-val__btn dk-val__btn--main" data-action="fix-all">Tout corriger</button>' : ""}</h3>
      <ul class="dk-val__bad">${bad.map((b) =>
        `<li><span class="dk-val__range">${b.key}</span><span class="dk-val__raw">${esc(b.raw)}</span><span class="dk-val__desc">${esc(b.message)}</span>
         <button type="button" class="dk-val__btn" data-action="fix" data-key="${b.key}">Corriger</button></li>`).join("")}</ul>`;
  }
  body.addEventListener("click", (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-action]");
    if (!el) return;
    const a = el.dataset.action;
    if (a === "fix") app.fixInvalid([el.dataset.key!]);
    else if (a === "fix-all") app.fixInvalid(undefined);
    else if (a === "del") app.setValidationRules(app.validationRules().filter((_, i) => i !== Number(el.dataset.i)));
    else if (a === "add") {
      const rule = readRule(body);
      if (!parseRange(rule.range)) return render("Plage invalide (ex. A1:A9).");
      app.setValidationRules([...app.validationRules(), rule]);
    } else return;
    render();
  });
  body.addEventListener("change", (e) => {
    if ((e.target as HTMLElement).getAttribute("name") !== "type") return;
    const t = (e.target as HTMLSelectElement).value;
    body.querySelectorAll<HTMLElement>("[data-for]").forEach((el) => { el.hidden = !el.dataset.for!.split(" ").includes(t); });
  });
  render();
}
