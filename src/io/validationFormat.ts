/** Strict validation of the data-validation rules of a `.dktable` sheet (`DocSheet.validation`). */
import { DktParseError, isObj } from "./parseError";
import { parseRange } from "../engine/range";
import type { ValRule } from "../engine/validation/types";

const TYPES = ["whole", "decimal", "list", "length"];

/** Reads an optional finite number field. */
function optNum(v: Record<string, unknown>, k: "min" | "max", at: string): number | undefined {
  if (v[k] === undefined) return undefined;
  if (typeof v[k] !== "number" || !Number.isFinite(v[k])) throw new DktParseError(`${at}.${k} must be a number`);
  return v[k] as number;
}

/** Validates the rules array, throwing a located DktParseError; unknown keys are dropped. */
export function checkValidation(v: unknown, at: string): ValRule[] {
  if (!Array.isArray(v)) throw new DktParseError(`${at} must be an array`);
  return v.map((r, i) => {
    const p = `${at}[${i}]`;
    if (!isObj(r)) throw new DktParseError(`${p} must be an object`);
    if (typeof r.range !== "string" || !parseRange(r.range)) throw new DktParseError(`${p}.range must be a range like A1:B5`);
    if (typeof r.type !== "string" || !TYPES.includes(r.type)) throw new DktParseError(`${p}.type must be one of ${TYPES.join(", ")}`);
    const rule: ValRule = { range: r.range, type: r.type as ValRule["type"] };
    const [min, max] = [optNum(r, "min", p), optNum(r, "max", p)];
    if (min !== undefined) rule.min = min;
    if (max !== undefined) rule.max = max;
    if (r.items !== undefined) {
      if (!Array.isArray(r.items) || r.items.some((x) => typeof x !== "string")) throw new DktParseError(`${p}.items must be an array of strings`);
      rule.items = r.items as string[];
    }
    return rule;
  });
}
