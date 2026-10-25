/**
 * Scénarios de l'app : capture de la sélection courante, application d'un scénario (écriture des valeurs puis
 * recalcul, un pas d'annulation par feuille concernée), registre du classeur (`scenarioStore.ts`).
 */
import { applyScenario, selectionCells, type Scenario, type ScenarioCell } from "../engine/scenario";
import { getScenarios, setScenarios } from "../engine/scenarioStore";
import type { DktDoc } from "../io/types";
import { batchEdit } from "./model";
import { touch } from "./appGrid";
import { setTitle, type Ctx } from "./appState";

/** Cellules variables = la sélection courante de la feuille active (vides incluses). */
export function selectionScenario(c: Ctx): ScenarioCell[] {
  return selectionCells(c.cur.id, c.cur.sheet, c.grid?.getSelection() ?? "A1");
}

/** Écrit les valeurs du scénario dans chaque feuille concernée, puis redessine (le recalcul suit les écritures). */
export function applyScenarioTo(c: Ctx, s: Scenario): void {
  for (const e of c.entries) {
    const cells = s.cells.filter((x) => x.sheet === e.id);
    if (cells.length) batchEdit(e, (sheet) => applyScenario(sheet, cells));
  }
  touch(c);
  setTitle(c, true);
}

/** Méthodes du contrat App liées aux scénarios (branchées dans appApi.ts). */
export function scenarioApi(c: Ctx) {
  return {
    getScenarios,
    setScenarios: (list: Scenario[]) => replaceScenarios(c, list),
    applyScenario: (s: Scenario) => applyScenarioTo(c, s),
    selectionScenarioCells: () => selectionScenario(c),
  };
}

/** Champ `scenarios` du document (absent si aucun scénario). */
export function scenarioField(): Pick<DktDoc, "scenarios"> {
  const scenarios = getScenarios();
  return scenarios.length ? { scenarios } : {};
}

/** Charge les scénarios du document ouvert (absent = aucun). */
export function loadScenarios(doc: DktDoc): void {
  setScenarios(doc.scenarios ?? []);
}

/** Remplace le registre du classeur (modification → état « modifié »). */
export function replaceScenarios(c: Ctx, list: Scenario[]): void {
  setScenarios(list);
  setTitle(c, true);
}
