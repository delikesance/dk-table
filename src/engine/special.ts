/**
 * Atteindre spécial (Ctrl+G > Spécial) : cellules vides, formules ou constantes d'une feuille, filtrées par type
 * de résultat et, à option, limitées aux lignes visibles. Pur : aucune écriture, renvoie les clés triées ligne par ligne.
 */
import type { Sheet, Value } from "./types";
import { isErr } from "./types";
import { getValue, getRaw } from "./sheet";
import { makeKey, parseKey } from "./address";

/** Cibles : vides (dans la zone utilisée), formules ou constantes (saisies sans « = »). */
export type SpecialKind = "blanks" | "formulas" | "constants";
/** Type de valeur calculée pour les formules et les constantes. */
export type SpecialType = "number" | "text" | "logical" | "error";

/** Options : `types` (tous si absent), `visible` = lignes (0-based) gardées, null = toutes. */
export interface SpecialOpts {
  kind: SpecialKind;
  types?: SpecialType[];
  visible?: number[] | null;
}

/** Type d'une valeur calculée (nombre, texte, logique, erreur). */
export function valueType(v: Value): SpecialType {
  if (isErr(v)) return "error";
  if (typeof v === "boolean") return "logical";
  return typeof v === "number" ? "number" : "text";
}

/** Clés des cellules répondant à `o`, triées ligne par ligne (A1, B1, … puis A2 …). */
export function specialKeys(sheet: Sheet, o: SpecialOpts): string[] {
  const pos = (k: string) => parseKey(k)!;
  const keep = new Set(o.visible ?? []);
  const matches = (k: string): boolean => {
    if (o.visible && !keep.has(pos(k).row - 1)) return false; // lignes filtrées : 0-based
    if (o.kind === "blanks") return getRaw(sheet, k) === "";
    if (getRaw(sheet, k) === "") return false;
    const formula = getRaw(sheet, k).startsWith("=");
    if ((o.kind === "formulas") !== formula) return false;
    return !o.types || o.types.includes(valueType(getValue(sheet, k)));
  };
  const keys = o.kind === "blanks" ? blankBox(sheet) : Object.keys(sheet.cells);
  return keys.filter(matches).sort((a, b) => pos(a).row - pos(b).row || pos(a).col - pos(b).col);
}

/** Toutes les cases de la zone utilisée (A1 jusqu'à la dernière ligne et colonne non vides) ; vide si la feuille l'est. */
function blankBox(sheet: Sheet): string[] {
  const ps = Object.keys(sheet.cells).map((k) => parseKey(k)!);
  if (!ps.length) return [];
  const cols = Math.max(...ps.map((p) => p.col)), rows = Math.max(...ps.map((p) => p.row));
  const out: string[] = [];
  for (let r = 1; r <= rows; r++) for (let c = 1; c <= cols; c++) out.push(makeKey(c, r));
  return out;
}
