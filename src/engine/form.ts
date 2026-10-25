/**
 * Vue Formulaire (saisie de lignes) : logique pure, sans DOM.
 * La ligne 1 de la grille de chaînes sert d'en-tête : un champ par colonne nommée.
 * Le type du champ (texte, nombre, date) se déduit des valeurs déjà saisies dans la colonne.
 * `checkForm` valide une saisie et renvoie les cellules à écrire (clés A1), ou les erreurs par colonne.
 */
import { makeKey } from "./address";

/** Type d'un champ : sert au contrôle de saisie et au type de la zone. */
export type FieldKind = "text" | "number" | "date";

/** Un champ du formulaire = une colonne nommée (`col` est l'index 0-based). */
export interface FormField {
  col: number;
  name: string;
  kind: FieldKind;
}

/** Résultat d'un envoi : cellules à écrire, ou erreurs par index de colonne. */
export type FormCheck =
  | { ok: true; cells: Record<string, string> }
  | { ok: false; errors: Record<number, string> };

const NUMBER = /^[+-]?\d+([.,]\d+)?$/;
const DATE_FR = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const DATE_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Vrai si `v` est une date réelle au format JJ/MM/AAAA ou AAAA-MM-JJ (31/02 refusé). */
export function isDate(v: string): boolean {
  const m = DATE_FR.exec(v) ?? DATE_ISO.exec(v);
  if (!m) return false;
  const [y, mo, d] = DATE_FR.test(v) ? [m[3], m[2], m[1]] : [m[1], m[2], m[3]];
  const t = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
  return t.getUTCFullYear() === Number(y) && t.getUTCMonth() === Number(mo) - 1 && t.getUTCDate() === Number(d);
}

/** Type déduit d'une colonne : nombre si tout est nombre, date si tout est date, sinon texte (vide inclus). */
function kindOf(values: string[]): FieldKind {
  const filled = values.filter((v) => v !== "");
  if (filled.length === 0) return "text";
  if (filled.every((v) => NUMBER.test(v.trim()))) return "number";
  if (filled.every(isDate)) return "date";
  return "text";
}

/** Un champ par colonne dont l'en-tête (ligne 1) n'est pas vide. Grille vide = aucun champ. */
export function formFields(grid: string[][]): FormField[] {
  if (grid.length === 0) return [];
  const header = grid[0];
  const out: FormField[] = [];
  header.forEach((name, col) => {
    if (name === "") return;
    const values = grid.slice(1).map((row) => (row[col] ?? "").trim());
    out.push({ col, name, kind: kindOf(values) });
  });
  return out;
}

/** Numéro (1-based) de la première ligne vide sous les données; jamais la ligne d'en-tête. */
export function nextRow(grid: string[][]): number {
  return Math.max(2, grid.length + 1);
}

/**
 * Contrôle une saisie (`values` par index de colonne) avant écriture dans la ligne `row`.
 * Obligatoire vide = erreur. Nombre: virgule acceptée, écrite avec un point. Date: voir `isDate`.
 * Les champs vides non obligatoires ne produisent aucune cellule.
 */
export function checkForm(
  fields: FormField[],
  values: Record<number, string>,
  required: Set<number>,
  row: number,
): FormCheck {
  const errors: Record<number, string> = {};
  const cells: Record<string, string> = {};
  for (const f of fields) {
    const v = (values[f.col] ?? "").trim();
    if (v === "") {
      if (required.has(f.col)) errors[f.col] = "Champ obligatoire";
      continue;
    }
    if (f.kind === "number" && !NUMBER.test(v)) errors[f.col] = "Nombre attendu";
    else if (f.kind === "date" && !isDate(v)) errors[f.col] = "Date attendue (JJ/MM/AAAA)";
    else cells[makeKey(f.col + 1, row)] = f.kind === "number" ? v.replace(",", ".") : v;
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, cells };
}
