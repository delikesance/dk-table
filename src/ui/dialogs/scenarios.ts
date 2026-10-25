/**
 * Données > Scénarios… : jeux nommés de valeurs d'entrée. « Enregistrer la sélection » crée un scénario avec les
 * cellules sélectionnées (32 au plus, refus explicite sinon) ; « Appliquer » écrit ses valeurs et ferme la boîte
 * pour montrer le résultat. Logique d'ajout : `addScenario` (engine/scenario.ts) ; registre : App.getScenarios/setScenarios.
 */
import { addScenario, removeScenario, type Scenario } from "../../engine/scenario";
import { openDialog } from "./dialog";
import "./scenarios.css";
import type { App } from "../appTypes";

/** Ouvre la boîte (une seule instance) : liste des scénarios + formulaire d'enregistrement de la sélection. */
export function openScenarios(app: App): void {
  const body = document.createElement("div");
  body.className = "dk-dialog__body dk-scn";
  body.innerHTML =
    '<ul class="dk-scn__list" data-role="list"></ul>' +
    '<p class="dk-dialog__hint">Les cellules sélectionnées deviennent les cellules variables (32 au plus).</p>' +
    '<label>Nom <input name="name" placeholder="Pire"></label>' +
    '<p class="dk-scn__err" role="alert"></p>' +
    '<button type="button" class="dk-dialog__btn" data-action="save-scenario">Enregistrer la sélection</button>';
  const list = body.querySelector<HTMLElement>('[data-role="list"]')!;
  const err = body.querySelector<HTMLElement>('[role="alert"]')!;
  const name = body.querySelector<HTMLInputElement>('input[name="name"]')!;

  /** Une ligne par scénario : nom (texte seul), Appliquer (ferme la boîte), Supprimer. */
  const render = (): void => {
    list.replaceChildren(...app.getScenarios().map((s) => scenarioRow(s)));
    if (!list.children.length) list.innerHTML = '<li class="dk-scn__empty">Aucun scénario.</li>';
  };
  const scenarioRow = (s: Scenario): HTMLElement => {
    const li = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = `${s.name} (${s.cells.length} cellule${s.cells.length > 1 ? "s" : ""})`;
    const apply = document.createElement("button");
    apply.type = "button";
    apply.className = "dk-dialog__btn";
    apply.dataset.action = "apply-scenario";
    apply.textContent = "Appliquer";
    apply.setAttribute("aria-label", `Appliquer ${s.name}`);
    apply.addEventListener("click", () => {
      app.applyScenario(s);
      body.closest(".dk-dialog")?.querySelector<HTMLElement>('[data-action="close"]')?.click();
    });
    const del = document.createElement("button");
    del.type = "button";
    del.className = "dk-dialog__btn";
    del.dataset.action = "remove-scenario";
    del.textContent = "Supprimer";
    del.setAttribute("aria-label", `Supprimer ${s.name}`);
    del.addEventListener("click", () => { app.setScenarios(removeScenario(app.getScenarios(), s.id)); render(); });
    li.append(label, " ", apply, " ", del);
    return li;
  };

  body.querySelector<HTMLElement>('[data-action="save-scenario"]')!.addEventListener("click", () => {
    const r = addScenario(app.getScenarios(), name.value, app.selectionScenarioCells());
    if ("error" in r) { err.textContent = r.error; return; }
    err.textContent = "";
    name.value = "";
    app.setScenarios(r.list);
    render();
  });
  render();
  openDialog("scenarios", "Scénarios", body);
}
