/**
 * Saisie par formulaire (palette « Saisie par formulaire… ») : un champ par colonne de la feuille active
 * (ligne 1 = en-têtes). Chaque champ peut être marqué « Obligatoire ». « Ajouter la ligne » contrôle la saisie
 * (`engine/form`), écrit la ligne suivante en un seul pas d'annulation, puis vide les champs.
 * La boîte reste ouverte pour enchaîner les saisies; Entrée dans un champ envoie aussi.
 */
import { openDialog } from "./dialog";
import { gridOf } from "./pivot";
import { formFields, nextRow, checkForm, type FormField } from "../../engine/form";
import type { App } from "../appTypes";
import "./form.css";

/** Libellé d'indication affiché sous le champ selon son type. */
const HINT: Record<FormField["kind"], string> = { text: "", number: "Nombre", date: "JJ/MM/AAAA" };

/** Ouvre le formulaire de la feuille active (une seule instance). */
export function openForm(app: Pick<App, "activeDoc" | "editMany">): void {
  const fields = formFields(gridOf(app.activeDoc().cells));
  const body = document.createElement("div");
  body.className = "dk-dialog__body dk-form";
  if (fields.length === 0) {
    body.innerHTML = '<p class="dk-dialog__hint">La première ligne doit contenir le nom de chaque colonne.</p>';
    openDialog("form", "Saisie par formulaire", body);
    return;
  }
  const required = new Set<number>();
  const inputs = new Map<number, HTMLInputElement>();
  const errors = new Map<number, HTMLElement>();
  const status = document.createElement("p");
  status.setAttribute("role", "status");
  status.className = "dk-form__status";

  for (const f of fields) {
    const row = document.createElement("div");
    row.className = "dk-form__field";
    const label = document.createElement("label");
    label.dataset.label = "";
    label.htmlFor = `dk-form-${f.col}`;
    label.textContent = f.name;
    const input = document.createElement("input");
    input.id = `dk-form-${f.col}`;
    input.type = "text";
    input.name = `f${f.col}`;
    input.dataset.field = String(f.col);
    input.autocomplete = "off";
    input.placeholder = HINT[f.kind];
    input.inputMode = f.kind === "number" ? "decimal" : "text";
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } });
    const req = document.createElement("label");
    req.className = "dk-form__req";
    const box = document.createElement("input");
    box.type = "checkbox";
    box.dataset.required = String(f.col);
    box.addEventListener("change", () => { if (box.checked) required.add(f.col); else required.delete(f.col); });
    req.append(box, " Obligatoire");
    const err = document.createElement("p");
    err.className = "dk-dialog__error";
    err.dataset.error = String(f.col);
    err.setAttribute("role", "alert");
    row.append(label, input, req, err);
    body.append(row);
    inputs.set(f.col, input);
    errors.set(f.col, err);
  }

  /** Contrôle la saisie et écrit la ligne suivante; en cas d'erreur, affiche le message sous chaque champ. */
  function submit(): void {
    const values: Record<number, string> = {};
    for (const [col, input] of inputs) values[col] = input.value;
    const grid = gridOf(app.activeDoc().cells);
    const row = nextRow(grid);
    const r = checkForm(fields, values, required, row);
    for (const [col, el] of errors) el.textContent = r.ok ? "" : (r.errors[col] ?? "");
    status.textContent = "";
    if (!r.ok) return;
    app.editMany(r.cells);
    for (const input of inputs.values()) input.value = "";
    status.textContent = `Ligne ${row} ajoutée`;
    inputs.get(fields[0].col)?.focus();
  }

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "dk-dialog__btn";
  btn.dataset.action = "submit";
  btn.textContent = "Ajouter la ligne";
  btn.addEventListener("click", submit);
  body.append(status, btn);
  openDialog("form", "Saisie par formulaire", body);
}
