/**
 * Gestionnaire de scénarios : jeux nommés de valeurs de cellules d'entrée (ex. « Base », « Pire », « Meilleur »).
 * Un scénario enregistre les valeurs brutes de ses cellules variables ; l'appliquer écrit ces valeurs et recalcule
 * les formules qui en dépendent. Logique pure (pas de DOM) : le registre est dans `scenarioStore.ts`,
 * le format dans `io/scenarioFormat.ts`, le branchement UI dans `ui/appScenarios.ts`.
 */
import { expandRange } from "./address";
import { getRaw, setCell } from "./sheet";
import type { Sheet } from "./types";

/** Nombre maximal de cellules variables par scénario (comme Excel). */
export const MAX_SCENARIO_CELLS = 32;

/** Une cellule variable : feuille (identifiant), adresse (ex. "B2") et valeur brute à écrire. */
export interface ScenarioCell {
  sheet: string;
  key: string;
  raw: string;
}

/** Jeu nommé de valeurs. `id` est stable, le nom est unique (sans casse). */
export interface Scenario {
  id: string;
  name: string;
  cells: ScenarioCell[];
}

/** Message d'erreur si `cells` dépasse la limite ou est vide ; `null` sinon. */
export function checkScenarioCells(cells: ScenarioCell[]): string | null {
  if (cells.length === 0) return "Un scénario doit contenir au moins une cellule.";
  if (cells.length > MAX_SCENARIO_CELLS)
    return `Un scénario est limité à ${MAX_SCENARIO_CELLS} cellules variables (ici : ${cells.length}).`;
  return null;
}

/** Ajoute un scénario ; refuse un nom vide ou déjà pris (sans casse) et les cellules hors limite. */
export function addScenario(
  list: Scenario[],
  name: string,
  cells: ScenarioCell[],
): { list: Scenario[] } | { error: string } {
  const label = name.trim();
  if (!label) return { error: "Donnez un nom au scénario." };
  if (list.some((s) => s.name.toLowerCase() === label.toLowerCase()))
    return { error: `Un scénario « ${label} » existe déjà.` };
  const error = checkScenarioCells(cells);
  if (error) return { error };
  const id = `sc-${Date.now().toString(36)}-${list.length}`;
  return { list: [...list, { id, name: label, cells: cells.map((c) => ({ ...c })) }] };
}

/** Retire le scénario d'identifiant `id` (liste inchangée si absent). */
export function removeScenario(list: Scenario[], id: string): Scenario[] {
  return list.filter((s) => s.id !== id);
}

/** Capture les valeurs brutes des clés `keys` d'une feuille (vides incluses, pour figer aussi l'absence de valeur). */
export function captureCells(sheetId: string, sheet: Sheet, keys: string[]): ScenarioCell[] {
  return keys.map((key) => ({ sheet: sheetId, key, raw: getRaw(sheet, key) }));
}

/** Capture la sélection (`A1` ou `A1:B3`) : une cellule variable par adresse de la plage, `[]` si invalide. */
export function selectionCells(sheetId: string, sheet: Sheet, selection: string): ScenarioCell[] {
  const [a, b = a] = selection.split(":");
  const keys = expandRange(sheet, a, b);
  return keys ? captureCells(sheetId, sheet, keys) : [];
}

/** Écrit les valeurs `cells` dans `sheet` (une feuille à la fois) ; le recalcul suit chaque écriture. */
export function applyScenario(sheet: Sheet, cells: ScenarioCell[]): void {
  for (const c of cells) setCell(sheet, c.key, c.raw);
}
