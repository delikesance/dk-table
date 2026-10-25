/** Validation du champ optionnel `functions` d'un fichier `.dktable` (fonctions nommées). */
import { DktParseError, isObj } from "./parseError";
import type { DocFn } from "./types";

/** Valide la liste des fonctions nommées, en levant une DktParseError localisée. */
export function checkFunctions(v: unknown): DocFn[] {
  if (!Array.isArray(v)) throw new DktParseError("functions must be an array");
  return v.map((f, i) => {
    const at = `functions[${i}]`;
    if (!isObj(f)) throw new DktParseError(`${at} must be an object`);
    if (typeof f.name !== "string" || !f.name) throw new DktParseError(`${at}.name must be a non-empty string`);
    if (!Array.isArray(f.params) || f.params.some((p) => typeof p !== "string"))
      throw new DktParseError(`${at}.params must be an array of strings`);
    if (typeof f.body !== "string") throw new DktParseError(`${at}.body must be a string`);
    return { name: f.name, params: [...f.params] as string[], body: f.body };
  });
}
