/**
 * Valeur cible (Goal Seek) sur une cellule: ajuste une constante numérique pour que
 * une cellule formule atteigne une valeur cible (tolérance absolue 1e-6). Moteur pur,
 * sans UI. En cas d'échec, la cellule variable reprend sa saisie d'origine.
 * Usage: `goalSeek(sheet, "B1", "A1", 16)` -> `{ ok: true, value: 5, ... }`.
 */
import type { Sheet } from "./types";
import { getRaw, getValue, setCell } from "./sheet";
import { normKey } from "./address";
import { findRoot } from "./goalSeekMath";

/** Tolérance absolue sur |résultat - cible|. */
export const GOAL_TOL = 1e-6;
/** Nombre maximal d'évaluations de la formule par recherche. */
export const GOAL_MAX_EVAL = 300;

/** Raison d'échec: cible non finie, cellule résultat non formule, variable non constante, pas de racine, plafond. */
export type GoalReason = "bad-target" | "not-formula" | "variable-not-constant" | "no-root" | "max-eval";

/** Résultat: succès (valeur trouvée) ou échec explicite; `original` = saisie d'origine de la variable. */
export type GoalSeekResult =
  | { ok: true; value: number; original: string; evals: number }
  | { ok: false; reason: GoalReason; message: string; original: string };

/** Messages français des raisons d'échec (affichés par l'UI). */
const MESSAGES: Record<GoalReason, string> = {
  "bad-target": "La valeur cible doit être un nombre fini.",
  "not-formula": "La cellule résultat doit contenir une formule.",
  "variable-not-constant": "La cellule variable doit contenir une constante numérique.",
  "no-root": "Aucune solution trouvée pour cette valeur cible.",
  "max-eval": "Nombre maximal d'itérations atteint sans solution.",
};

/** Constante numérique saisie (décimal, signe, exposant), sans formule ni texte. */
const NUMBER = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;

/** Arrondi à 15 chiffres significatifs: au-delà, `recalc.ts` garderait la saisie en texte (`longnum.ts`). */
const snap = (x: number): number => Number(x.toPrecision(15));

/** Cherche la valeur de `varKey` qui rend `formulaKey` égale à `target`; restaure la variable si échec. */
export function goalSeek(sheet: Sheet, formulaKey: string, varKey: string, target: number, opts: { maxEval?: number } = {}): GoalSeekResult {
  const fKey = normKey(formulaKey);
  const vKey = normKey(varKey);
  const original = getRaw(sheet, vKey);
  const fail = (reason: GoalReason): GoalSeekResult => ({ ok: false, reason, message: MESSAGES[reason], original });

  if (!Number.isFinite(target)) return fail("bad-target");
  if (!getRaw(sheet, fKey).trim().startsWith("=")) return fail("not-formula");
  const x0 = original.trim();
  if (!NUMBER.test(x0) || !Number.isFinite(Number(x0))) return fail("variable-not-constant");

  // Écrit x (arrondi), recalcule et renvoie l'écart à la cible (NaN si la formule est en erreur).
  const residual = (x: number): number => {
    setCell(sheet, vKey, String(snap(x)));
    const v = getValue(sheet, fKey);
    return typeof v === "number" ? v - target : Number.NaN;
  };

  const r = findRoot(residual, Number(x0), { tol: GOAL_TOL, maxEval: opts.maxEval ?? GOAL_MAX_EVAL });
  if (!r.ok) {
    setCell(sheet, vKey, original);
    return fail(r.reason);
  }
  // La dernière sonde n'est pas forcément la racine: on écrit la solution retenue.
  const value = snap(r.x);
  setCell(sheet, vKey, String(value));
  return { ok: true, value, original, evals: r.evals };
}
