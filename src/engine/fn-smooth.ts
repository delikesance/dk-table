/**
 * Moyenne mobile (MOVING_AVERAGE) et lissage exponentiel (EXP_SMOOTH), en fonctions de débordement :
 * elles renvoient une colonne de résultats, déversée par spill.ts. Enregistrées dans SPILL_FORMS (fn-spill.ts).
 * Entrée : plage à une colonne ou une ligne, lue dans l'ordre ; autre forme -> #VALUE!.
 */
import type { SArg, SpillResult } from "./fn-spill";
import { err, isErr, type Value } from "./types";
import { toNum } from "./values";

/** Valeurs d'une plage (ou d'un scalaire) à une colonne ou une ligne ; autre forme -> undefined. */
function series(a: SArg): Value[] | undefined {
  if (!Array.isArray(a)) return [a];
  if (a.length !== 1 && a[0].length !== 1) return undefined;
  return a.flat();
}

/** Premier argument en scalaire (matrice -> première cellule). */
function first(a: SArg | undefined): Value {
  return Array.isArray(a) ? (a[0]?.[0] ?? "") : (a ?? "");
}

/** Première erreur de la série, sinon undefined. */
function firstErr(xs: Value[]) {
  return xs.find(isErr);
}

/**
 * MOVING_AVERAGE(plage; fenêtre) : moyenne des `fenêtre` dernières valeurs.
 * Les `fenêtre - 1` premières positions sont vides ; une fenêtre avec une case vide ou non numérique donne une case vide.
 * Fenêtre absente de 1..nombre de valeurs (ou non entière) -> #NUM!.
 */
export function movingAverage(args: SArg[]): SpillResult {
  if (args.length !== 2) return err("#VALUE!");
  const xs = series(args[0]);
  if (!xs) return err("#VALUE!");
  const w = toNum(first(args[1]));
  if (typeof w !== "number") return w;
  if (!Number.isInteger(w) || w < 1 || w > xs.length) return err("#NUM!");
  const e = firstErr(xs);
  if (e) return e;
  return xs.map((_, i) => {
    if (i < w - 1) return [""];
    const win = xs.slice(i - w + 1, i + 1);
    if (!win.every((x) => typeof x === "number")) return [""];
    return [(win as number[]).reduce((a, b) => a + b, 0) / w];
  });
}

/**
 * EXP_SMOOTH(plage; alpha) : s_1 = x_1, puis s_t = alpha*x_t + (1-alpha)*s_(t-1), alpha dans ]0;1].
 * Une case vide ou non numérique donne une case vide et ne met pas s à jour.
 * alpha hors ]0;1] -> #NUM!.
 */
export function expSmooth(args: SArg[]): SpillResult {
  if (args.length !== 2) return err("#VALUE!");
  const xs = series(args[0]);
  if (!xs) return err("#VALUE!");
  const alpha = toNum(first(args[1]));
  if (typeof alpha !== "number") return alpha;
  if (!(alpha > 0 && alpha <= 1)) return err("#NUM!");
  const e = firstErr(xs);
  if (e) return e;
  const out: Value[][] = [];
  let s: number | undefined;
  for (const x of xs) {
    if (typeof x !== "number") {
      out.push([""]);
      continue;
    }
    s = s === undefined ? x : alpha * x + (1 - alpha) * s;
    out.push([s]);
  }
  return out;
}

/** Fonctions de débordement de lissage par nom en majuscules (fusionnées dans SPILL_FORMS). */
export const SMOOTH_FORMS: Record<string, (args: SArg[]) => SpillResult> = {
  MOVING_AVERAGE: movingAverage,
  EXP_SMOOTH: expSmooth,
};
