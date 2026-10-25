/**
 * Validation du champ optionnel `scenarios` d'un fichier `.dktable` (gestionnaire de scénarios).
 * Une DktParseError localisée est levée pour toute forme invalide ; la limite de cellules vient de `engine/scenario.ts`.
 */
import { checkScenarioCells, type Scenario } from "../engine/scenario";
import { DktParseError, isObj } from "./parseError";

/** Valide la liste des scénarios ; `sheetIds` = identifiants des feuilles du classeur. */
export function checkScenarios(v: unknown, sheetIds: Set<string>): Scenario[] {
  if (!Array.isArray(v)) throw new DktParseError("scenarios must be an array");
  return v.map((s, i) => {
    const at = `scenarios[${i}]`;
    if (!isObj(s)) throw new DktParseError(`${at} must be an object`);
    if (typeof s.id !== "string" || !s.id) throw new DktParseError(`${at}.id must be a non-empty string`);
    if (typeof s.name !== "string" || !s.name.trim()) throw new DktParseError(`${at}.name must be a non-empty string`);
    if (!Array.isArray(s.cells)) throw new DktParseError(`${at}.cells must be an array`);
    const cells = s.cells.map((c, j) => {
      const cat = `${at}.cells[${j}]`;
      if (!isObj(c) || typeof c.sheet !== "string" || typeof c.key !== "string" || typeof c.raw !== "string")
        throw new DktParseError(`${cat} must be { sheet, key, raw } strings`);
      if (!sheetIds.has(c.sheet)) throw new DktParseError(`${cat}.sheet must be the id of an existing sheet`);
      return { sheet: c.sheet, key: c.key, raw: c.raw };
    });
    const error = checkScenarioCells(cells);
    if (error) throw new DktParseError(`${at}: ${error}`);
    return { id: s.id, name: s.name, cells };
  });
}
