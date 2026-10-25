/**
 * Tables de données (What-if) à 1 ou 2 variables: pour chaque valeur d'entrée, substitue la valeur
 * dans la ou les cellules d'entrée, lit la formule résultat, puis restaure les saisies d'origine.
 * Moteur pur, sans UI. Les valeurs sont des saisies brutes (texte ou nombre), comme `setCell`.
 * Usage: `dataTable1(sheet, { formula: "D1", input: "C1", values: ["1", "2"] })` -> `{ ok: true, results: [11, 21] }`.
 */
import type { Sheet, Value } from "./types";
import { getRaw, getValue, setCell } from "./sheet";
import { inBounds, normKey } from "./address";
import { getState } from "./state";
import { calcMode } from "./calc-mode";
import { recalc } from "./recalc";
import { parseFormula } from "./parser";

/** Raison d'échec: entrée invalide ou dupliquée, entrée circulaire, cellule résultat non formule. */
export type DataTableReason = "bad-input" | "input-circular" | "not-formula" | "bad-formula";

/** Résultat: valeurs calculées (une par valeur, ou une grille) ou erreur explicite. */
export type DataTableResult<T> = { ok: true; results: T } | { ok: false; reason: DataTableReason; message: string };

/** Messages français des raisons d'échec (affichés par l'UI). */
const MESSAGES: Record<DataTableReason, string> = {
  "bad-input": "Cellule d'entrée invalide: une adresse de la feuille, différente pour chaque entrée.",
  "input-circular": "La cellule d'entrée dépend de la cellule résultat: référence circulaire.",
  "not-formula": "La cellule résultat doit contenir une formule.",
  "bad-formula": "La formule résultat a une syntaxe invalide.",
};

/** Vrai si `target` est lue, directement ou non, par `from` (suit les précédents dans la feuille). */
function reaches(sheet: Sheet, from: string, target: string): boolean {
  const prec = getState(sheet).prec;
  const seen = new Set<string>();
  const stack = [from];
  while (stack.length) {
    for (const p of prec.get(stack.pop()!) ?? []) {
      if (p === target) return true;
      if (!seen.has(p)) {
        seen.add(p);
        stack.push(p);
      }
    }
  }
  return false;
}

/** Vérifie les entrées (adresses valides) et la formule résultat; renvoie la raison d'échec ou null. */
function check(sheet: Sheet, formula: string, inputs: string[]): DataTableReason | null {
  if (!inputs.every((k) => inBounds(sheet, k))) return "bad-input";
  const raw = getRaw(sheet, formula);
  if (!raw.startsWith("=")) return "not-formula";
  try {
    parseFormula(raw.slice(1));
  } catch {
    return "bad-formula";
  }
  for (const k of inputs) if (k === formula || reaches(sheet, k, formula)) return "input-circular";
  return null;
}

/** Écrit la saisie `raw` dans `k`; en mode manuel, propage aux dépendants (setCell ne le fait pas). */
function write(sheet: Sheet, k: string, raw: string): void {
  setCell(sheet, k, raw);
  if (calcMode().manual) recalc(sheet, k);
}

/** Écrit les saisies `assign`, puis lit la valeur de la formule. */
function probe(sheet: Sheet, formula: string, assign: [string, string][]): Value {
  for (const [k, raw] of assign) write(sheet, k, raw);
  return getValue(sheet, formula);
}

/** Exécute `run` puis restaure la saisie d'origine des cellules `keys`, même en cas d'exception. */
function restoreAfter<T>(sheet: Sheet, keys: string[], run: () => T): T {
  const saved = keys.map((k): [string, string] => [k, getRaw(sheet, k)]);
  try {
    return run();
  } finally {
    for (const [k, raw] of saved) write(sheet, k, raw);
  }
}

/** Échec typé avec son message français. */
function fail<T>(reason: DataTableReason): DataTableResult<T> {
  return { ok: false, reason, message: MESSAGES[reason] };
}

/** Table à 1 variable: une valeur par ligne, `results[i]` = formule avec `input` = `values[i]`. */
export function dataTable1(sheet: Sheet, spec: { formula: string; input: string; values: string[] }): DataTableResult<Value[]> {
  const formula = normKey(spec.formula);
  const input = normKey(spec.input);
  const bad = check(sheet, formula, [input]);
  if (bad) return fail(bad);
  return restoreAfter(sheet, [input], () => ({
    ok: true,
    results: spec.values.map((v) => probe(sheet, formula, [[input, v]])),
  }));
}

/**
 * Table à 2 variables: `results[r][c]` = formule avec `rowInput` = `rowValues[c]` et
 * `colInput` = `colValues[r]` (une ligne par valeur de colonne, une colonne par valeur de ligne).
 */
export function dataTable2(
  sheet: Sheet,
  spec: { formula: string; rowInput: string; colInput: string; rowValues: string[]; colValues: string[] },
): DataTableResult<Value[][]> {
  const formula = normKey(spec.formula);
  const rowInput = normKey(spec.rowInput);
  const colInput = normKey(spec.colInput);
  if (rowInput === colInput) return fail("bad-input");
  const bad = check(sheet, formula, [rowInput, colInput]);
  if (bad) return fail(bad);
  return restoreAfter(sheet, [rowInput, colInput], () => ({
    ok: true,
    results: spec.colValues.map((cv) =>
      spec.rowValues.map((rv) => probe(sheet, formula, [[rowInput, rv], [colInput, cv]])),
    ),
  }));
}
