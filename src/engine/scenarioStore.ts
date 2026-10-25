/**
 * Registre des scénarios du classeur ouvert (même rôle que `userfnStore.ts`) : chargé depuis le `.dktable`,
 * relu à l'enregistrement. Lecture/écriture par copie, pour que l'appelant ne modifie pas le registre en place.
 */
import type { Scenario } from "./scenario";

let scenarios: Scenario[] = [];

/** Remplace les scénarios du classeur (copie superficielle). */
export function setScenarios(list: Scenario[]): void {
  scenarios = list.map((s) => ({ ...s, cells: s.cells.map((c) => ({ ...c })) }));
}

/** Scénarios du classeur (copie : modifier le résultat ne change pas le registre). */
export function getScenarios(): Scenario[] {
  return scenarios.map((s) => ({ ...s, cells: s.cells.map((c) => ({ ...c })) }));
}
