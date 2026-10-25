/** Rule editor of the validation dialog: form markup, reading it back, and a one-line rule summary. */
import type { ValRule, ValType } from "../../engine/validation/types";

const LABELS: Record<ValType, string> = { whole: "Nombre entier", decimal: "Nombre décimal", list: "Liste", length: "Longueur du texte" };

/** One-line French summary of a rule, e.g. "Nombre entier entre 1 et 10". */
export function describeVal(r: ValRule): string {
  if (r.type === "list") return `Liste : ${(r.items ?? []).join(", ")}`;
  const b = r.min !== undefined && r.max !== undefined ? ` entre ${r.min} et ${r.max}` : r.min !== undefined ? ` ≥ ${r.min}` : r.max !== undefined ? ` ≤ ${r.max}` : "";
  return `${LABELS[r.type]}${b}`;
}

/** Form markup for a new rule, range prefilled with the current selection. */
export function ruleForm(selection: string): string {
  const opts = (Object.keys(LABELS) as ValType[]).map((t) => `<option value="${t}">${LABELS[t]}</option>`).join("");
  return `<div class="dk-val__form">
    <label>Plage <input name="range" value="${selection}" spellcheck="false"></label>
    <label>Type <select name="type">${opts}</select></label>
    <label data-for="whole decimal length">Min <input name="min" type="number" step="any"></label>
    <label data-for="whole decimal length">Max <input name="max" type="number" step="any"></label>
    <label data-for="list" hidden>Valeurs <input name="items" placeholder="oui, non"></label>
    <button type="button" class="dk-val__btn dk-val__btn--main" data-action="add">Ajouter la règle</button></div>`;
}

/** Read the rule typed in the form (bounds only when filled; list items trimmed, empties dropped). */
export function readRule(root: HTMLElement): ValRule {
  const v = (n: string): string => root.querySelector<HTMLInputElement>(`[name="${n}"]`)?.value.trim() ?? "";
  const type = v("type") as ValType;
  const rule: ValRule = { range: v("range").toUpperCase(), type };
  if (type === "list") return { ...rule, items: v("items").split(",").map((s) => s.trim()).filter(Boolean) };
  if (v("min") !== "") rule.min = Number(v("min"));
  if (v("max") !== "") rule.max = Number(v("max"));
  return rule;
}
