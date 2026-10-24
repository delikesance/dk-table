/**
 * Rule editor of the « Formatage conditionnel » dialog: range, rule type, the parameters of
 * that type (other fields are hidden), and the format (fill, text color, bold, italic) or the
 * colors of a scale / data bar. `readRule` validates the form and builds the rule.
 */
import { CF_TYPES, cfId, type CfFormat, type CfKind, type CfRule } from "../../engine/cf/types";
import { cellsOf } from "../../engine/cf/compute";
import { FILL_COLORS, TEXT_COLORS } from "../toolbar/colors";
import { OP_LABELS, TEXT_OP_LABELS, TYPE_LABELS } from "./describe";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const opts = (o: Record<string, string>) => Object.entries(o).map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join("");
const CLASSIC = CF_TYPES.filter((t) => t !== "scale" && t !== "bar").join(" ");

/** Form markup; `data-types` lists the rule types a field applies to. */
const HTML = `
<label class="dk-cf__field">Plage<input name="range" autocomplete="off" spellcheck="false"></label>
<label class="dk-cf__field">Règle<select name="type">${opts(TYPE_LABELS)}</select></label>
<div class="dk-cf__row" data-types="cell">
  <select name="op" aria-label="Comparaison">${opts(Object.fromEntries(Object.entries(OP_LABELS).map(([k, v]) => [k, v[1]])))}</select>
  <input name="a" aria-label="Valeur" placeholder="Valeur ou =formule">
  <span data-between>et</span><input name="b" aria-label="Seconde valeur" data-between>
</div>
<div class="dk-cf__row" data-types="text">
  <select name="textOp" aria-label="Comparaison">${opts(Object.fromEntries(Object.entries(TEXT_OP_LABELS).map(([k, v]) => [k, v[1]])))}</select>
  <input name="text" aria-label="Texte">
</div>
<div class="dk-cf__row" data-types="top bottom">
  <input name="n" type="number" min="1" step="1" value="10" aria-label="Nombre">
  <label class="dk-dialog__check"><input type="checkbox" name="percent"> %</label>
</div>
<label class="dk-cf__field" data-types="formula">Formule (pour la première cellule de la plage)<input name="formula" spellcheck="false" placeholder="=B1>0"></label>
<fieldset class="dk-cf__format" data-types="${CLASSIC}"><legend>Format</legend>
  <div class="dk-cf__swatches" role="radiogroup" aria-label="Remplissage">
    <label class="dk-cf__swatch dk-cf__swatch--none" title="Aucun remplissage"><input type="radio" name="fill" value="" aria-label="Aucun remplissage"></label>
    ${FILL_COLORS.map((c) => `<label class="dk-cf__swatch" style="background:${c.value}" title="${c.name}"><input type="radio" name="fill" value="${c.value}" aria-label="${c.name}"></label>`).join("")}
  </div>
  <div class="dk-cf__row">
    <select name="color" aria-label="Couleur du texte"><option value="">Texte : couleur normale</option>${TEXT_COLORS.map((c) => `<option value="${c.value}">Texte : ${c.name.toLowerCase()}</option>`).join("")}</select>
    <label class="dk-dialog__check"><input type="checkbox" name="bold"> Gras</label>
    <label class="dk-dialog__check"><input type="checkbox" name="italic"> Italique</label>
  </div>
</fieldset>
<div class="dk-cf__row" data-types="scale">
  <label class="dk-cf__color">Minimum<input type="color" name="min" value="#ffffff"></label>
  <label class="dk-dialog__check"><input type="checkbox" name="useMid"> Milieu</label><input type="color" name="mid" value="#c6c6ff" aria-label="Milieu">
  <label class="dk-cf__color">Maximum<input type="color" name="max" value="#0000f2"></label>
</div>
<label class="dk-cf__color" data-types="bar">Couleur<input type="color" name="bar" value="#0000f2"></label>
<p class="dk-cf__error" role="alert"></p>
<div class="dk-cf__actions">
  <button type="button" class="dk-cf__btn" data-action="cancel">Annuler</button>
  <button type="submit" class="dk-dialog__btn" data-action="save">Enregistrer</button>
</div>`;

type Fields = HTMLFormControlsCollection & Record<string, HTMLInputElement & HTMLSelectElement>;
const fields = (f: HTMLFormElement) => f.elements as Fields;

/** Show only the fields of the selected type (and the second operand for « entre »). */
function sync(f: HTMLFormElement): void {
  const el = fields(f), type = el.type.value;
  for (const n of f.querySelectorAll<HTMLElement>("[data-types]")) n.hidden = !n.dataset.types!.split(" ").includes(type);
  const between = el.op.value === "between" || el.op.value === "notBetween";
  for (const n of f.querySelectorAll<HTMLElement>("[data-between]")) n.hidden = !between;
  el.mid.disabled = !el.useMid.checked;
}

/** Fill the form from an existing rule. */
function load(f: HTMLFormElement, r: CfRule): void {
  const el = fields(f);
  el.type.value = r.type;
  if (r.type === "cell") { el.op.value = r.op; el.a.value = r.a; el.b.value = r.b ?? ""; }
  if (r.type === "text") { el.textOp.value = r.op; el.text.value = r.text; }
  if (r.type === "top" || r.type === "bottom") { el.n.value = String(r.n); el.percent.checked = !!r.percent; }
  if (r.type === "formula") el.formula.value = r.formula;
  if (r.type === "scale") { el.min.value = r.min; el.max.value = r.max; el.useMid.checked = !!r.mid; if (r.mid) el.mid.value = r.mid; }
  if (r.type === "bar") el.bar.value = r.color;
  const fmt: CfFormat = "format" in r ? r.format : {};
  f.querySelector<HTMLInputElement>(`input[name="fill"][value="${fmt.fill ?? ""}"]`)?.click();
  el.color.value = fmt.color ?? "";
  el.bold.checked = !!fmt.bold; el.italic.checked = !!fmt.italic;
}

/** Build the editor; `init` = rule being edited (null for a new one), `range` = default range. */
export function ruleForm(init: CfRule | null, range: string): HTMLFormElement {
  const f = document.createElement("form");
  f.className = "dk-cf__form";
  f.innerHTML = HTML;
  const el = fields(f);
  el.range.value = range;
  f.querySelector<HTMLInputElement>('input[name="fill"][value="#fde2e0"]')!.checked = true;
  if (init) { el.range.value = init.range; load(f, init); }
  f.addEventListener("change", () => sync(f));
  sync(f);
  return f;
}

/** Format part of a classic rule (only the properties actually set). */
function formatOf(el: Fields): CfFormat {
  const fill = (el.namedItem("fill") as unknown as RadioNodeList).value;
  return { ...(fill ? { fill } : {}), ...(el.color.value ? { color: el.color.value } : {}),
    ...(el.bold.checked ? { bold: true } : {}), ...(el.italic.checked ? { italic: true } : {}) };
}

/** Validated rule from the form (keeping `id`), or the French reason it is invalid. */
export function readRule(f: HTMLFormElement, id = cfId()): CfRule | string {
  const el = fields(f), type = el.type.value as CfKind["type"], range = el.range.value.trim().toUpperCase();
  if (!range || cellsOf(range).length === 0 || !/^[A-Z0-9$:,;\s]+$/.test(range)) return "Plage invalide (ex. A1:A20).";
  let kind: CfKind;
  if (type === "cell") {
    const between = el.op.value === "between" || el.op.value === "notBetween";
    if (!el.a.value.trim() || (between && !el.b.value.trim())) return "Indiquez la valeur à comparer.";
    kind = { type, op: el.op.value as never, a: el.a.value.trim(), ...(between ? { b: el.b.value.trim() } : {}), format: formatOf(el) };
  } else if (type === "text") {
    if (!el.text.value) return "Indiquez le texte recherché.";
    kind = { type, op: el.textOp.value as never, text: el.text.value, format: formatOf(el) };
  } else if (type === "top" || type === "bottom") {
    const n = Number(el.n.value);
    if (!Number.isInteger(n) || n < 1) return "Le nombre doit être un entier positif.";
    kind = { type, n, ...(el.percent.checked ? { percent: true } : {}), format: formatOf(el) };
  } else if (type === "formula") {
    const formula = el.formula.value.trim();
    if (!formula) return "Indiquez une formule.";
    kind = { type, formula: formula.startsWith("=") ? formula : `=${formula}`, format: formatOf(el) };
  } else if (type === "scale") {
    kind = { type, min: el.min.value, ...(el.useMid.checked ? { mid: el.mid.value } : {}), max: el.max.value };
  } else if (type === "bar") {
    kind = { type, color: el.bar.value };
  } else kind = { type, format: formatOf(el) };
  return { id, range, ...kind } as CfRule;
}
