/**
 * « Formatage conditionnel » dialog (menu Format, palette): the active sheet's rules by priority
 * (first wins), each with a preview, its summary and range, and Monter / Descendre / Modifier /
 * Supprimer; « Nouvelle règle » opens the editor (`form.ts`) on the current selection.
 * Every change is applied at once through `setCfRules` (one undo step each).
 */
import { openDialog } from "../dialogs/dialog";
import { icon } from "../icons";
import { describeRule } from "./describe";
import { readRule, ruleForm } from "./form";
import type { CfRule } from "../../engine/cf/types";
import type { App } from "../appTypes";
import "./cf.css";

/** What the dialog needs from the app. */
export type CfHost = Pick<App, "cfRules" | "setCfRules" | "selection">;

/** Inline preview style of a rule (its format, or its colors for scales/bars). */
function previewStyle(r: CfRule): string {
  if (r.type === "scale") return `background:linear-gradient(90deg,${r.min},${r.mid ?? r.min},${r.max})`;
  if (r.type === "bar") return `background:linear-gradient(90deg,${r.color}66 60%,transparent 60%)`;
  const f = r.format;
  return [f.fill && `background:${f.fill}`, f.color && `color:${f.color}`, f.bold && "font-weight:700", f.italic && "font-style:italic"]
    .filter(Boolean).join(";");
}

/** Icon button of a rule row. */
const btn = (action: string, label: string, name: string, disabled = false) =>
  `<button type="button" class="dk-cf__icon" data-action="${action}" aria-label="${label}" title="${label}"${disabled ? " disabled" : ""}>${icon(name)}</button>`;

/** Open the dialog (one instance) on the active sheet of `app`. */
export function openCfDialog(app: CfHost): void {
  const body = document.createElement("div");
  body.className = "dk-dialog__body dk-cf";
  const box = openDialog("cf", "Formatage conditionnel", body);
  if (box.contains(body)) box.classList.add("dk-dialog--wide");
  else return; // already open

  const foot = box.querySelector<HTMLElement>(".dk-dialog__foot")!;
  const save = (rules: CfRule[]) => { app.setCfRules(rules); list(); };

  /** Rule list view. */
  function list(): void {
    const rules = app.cfRules();
    const ul = document.createElement("ul");
    ul.className = "dk-cf__list";
    rules.forEach((r, i) => {
      const li = document.createElement("li");
      li.className = "dk-cf__item";
      li.innerHTML = `<span class="dk-cf__preview" style="${previewStyle(r)}">123</span>
        <span class="dk-cf__desc"></span><span class="dk-cf__range"></span>
        ${btn("up", "Monter", "arrow-up", i === 0)}${btn("down", "Descendre", "arrow-down", i === rules.length - 1)}
        ${btn("edit", "Modifier", "edit")}${btn("delete", "Supprimer", "trash")}`;
      li.querySelector(".dk-cf__desc")!.textContent = describeRule(r);
      li.querySelector(".dk-cf__range")!.textContent = r.range;
      li.addEventListener("click", (e) => {
        const a = (e.target as HTMLElement).closest<HTMLElement>("[data-action]")?.dataset.action;
        const next = [...rules];
        if (a === "up" || a === "down") {
          const j = a === "up" ? i - 1 : i + 1;
          [next[i], next[j]] = [next[j], next[i]];
          save(next);
        } else if (a === "delete") { next.splice(i, 1); save(next); }
        else if (a === "edit") edit(r, i);
      });
      ul.append(li);
    });
    const empty = document.createElement("p");
    empty.className = "dk-cf__empty";
    empty.textContent = "Aucune règle sur cette feuille.";
    const add = document.createElement("button");
    add.type = "button"; add.className = "dk-cf__btn"; add.dataset.action = "add";
    add.innerHTML = `${icon("plus")}Nouvelle règle`;
    add.addEventListener("click", () => edit(null, rules.length));
    body.replaceChildren(rules.length ? ul : empty, add);
    foot.style.display = "";
    add.focus();
  }

  /** Editor view for rule `init` (null = new rule inserted at `at`). */
  function edit(init: CfRule | null, at: number): void {
    const form = ruleForm(init, init?.range ?? app.selection());
    form.querySelector('[data-action="cancel"]')!.addEventListener("click", list);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const r = readRule(form, init?.id);
      if (typeof r === "string") { form.querySelector(".dk-cf__error")!.textContent = r; return; }
      const next = app.cfRules();
      next.splice(at, init ? 1 : 0, r);
      save(next);
    });
    body.replaceChildren(form);
    foot.style.display = "none"; // the editor has its own Annuler / Enregistrer
    form.querySelector<HTMLElement>("[name=range]")!.focus();
  }

  list();
}
