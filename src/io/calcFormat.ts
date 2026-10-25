/**
 * Champ optionnel `calc` d'un `.dktable` : mode de calcul du classeur (manuel, itératif, réglages).
 * Absent = automatique sans itérations (valeurs de `DEFAULT_CALC`), ce qui garde les fichiers légers.
 */
import { DEFAULT_CALC, type CalcMode } from "../engine/calc-mode";
import { DktParseError, isObj } from "./parseError";

/** Champ à écrire dans le document : `undefined` si le mode est celui par défaut. */
export function calcToDoc(m: CalcMode): CalcMode | undefined {
  const same = (Object.keys(DEFAULT_CALC) as Array<keyof CalcMode>).every((k) => m[k] === DEFAULT_CALC[k]);
  return same ? undefined : { manual: m.manual, iterative: m.iterative, maxIter: m.maxIter, maxChange: m.maxChange };
}

/** Valide le champ `calc` ; les réglages absents prennent leur valeur par défaut. */
export function checkCalc(v: unknown): CalcMode {
  if (!isObj(v)) throw new DktParseError("calc must be an object");
  const out = { ...DEFAULT_CALC };
  for (const k of ["manual", "iterative"] as const) {
    if (v[k] === undefined) continue;
    if (typeof v[k] !== "boolean") throw new DktParseError(`calc.${k} must be a boolean`);
    out[k] = v[k] as boolean;
  }
  if (v.maxIter !== undefined) {
    if (!Number.isInteger(v.maxIter) || (v.maxIter as number) < 1) throw new DktParseError("calc.maxIter must be an integer >= 1");
    out.maxIter = v.maxIter as number;
  }
  if (v.maxChange !== undefined) {
    if (typeof v.maxChange !== "number" || !(v.maxChange > 0) || !Number.isFinite(v.maxChange))
      throw new DktParseError("calc.maxChange must be a positive number");
    out.maxChange = v.maxChange;
  }
  return out;
}
