/** Strict validation of the conditional formatting rules of a `.dktable` sheet (`DocSheet.cf`). */
import { DktParseError, isObj } from "./parseError";
import type { CfFormat, CfKind, CfRule } from "../engine/cf/types";
import { CF_TYPES } from "../engine/cf/types";

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const OPS = ["gt", "ge", "lt", "le", "eq", "ne", "between", "notBetween"];
const TEXT_OPS = ["contains", "notContains", "begins", "ends"];

/** Reads `v[k]` as a string (optionally a `#hex` color); throws a located error otherwise. */
function str(v: Record<string, unknown>, k: string, at: string, color = false): string {
  const x = v[k];
  if (typeof x !== "string" || (color && !HEX.test(x))) {
    throw new DktParseError(`${at}.${k} must be ${color ? "#rgb or #rrggbb" : "a string"}`);
  }
  return x;
}

/** Reads `v[k]` as one of `allowed`. */
function oneOf<T extends string>(v: Record<string, unknown>, k: string, allowed: readonly string[], at: string): T {
  if (typeof v[k] !== "string" || !allowed.includes(v[k] as string)) {
    throw new DktParseError(`${at}.${k} must be one of ${allowed.join(", ")}`);
  }
  return v[k] as T;
}

/** Validates a rule's format (fill/color as strings, bold/italic booleans; unknown keys dropped). */
function checkFormat(v: unknown, at: string): CfFormat {
  if (!isObj(v)) throw new DktParseError(`${at} must be an object`);
  const f: CfFormat = {};
  for (const k of ["fill", "color"] as const) if (v[k] !== undefined) f[k] = str(v, k, at, true);
  for (const k of ["bold", "italic"] as const) {
    if (v[k] === undefined) continue;
    if (typeof v[k] !== "boolean") throw new DktParseError(`${at}.${k} must be a boolean`);
    f[k] = v[k] as boolean;
  }
  return f;
}

/** Validates the type-specific part of a rule. */
function checkKind(v: Record<string, unknown>, at: string): CfKind {
  const type = oneOf<CfKind["type"]>(v, "type", CF_TYPES, at);
  switch (type) {
    case "cell": return { type, op: oneOf(v, "op", OPS, at), a: str(v, "a", at),
      ...(v.b !== undefined ? { b: str(v, "b", at) } : {}), format: checkFormat(v.format, `${at}.format`) };
    case "text": return { type, op: oneOf(v, "op", TEXT_OPS, at), text: str(v, "text", at), format: checkFormat(v.format, `${at}.format`) };
    case "top": case "bottom": {
      if (typeof v.n !== "number" || !Number.isInteger(v.n) || v.n < 1) throw new DktParseError(`${at}.n must be an integer >= 1`);
      if (v.percent !== undefined && typeof v.percent !== "boolean") throw new DktParseError(`${at}.percent must be a boolean`);
      return { type, n: v.n, ...(v.percent ? { percent: true } : {}), format: checkFormat(v.format, `${at}.format`) };
    }
    case "formula": return { type, formula: str(v, "formula", at), format: checkFormat(v.format, `${at}.format`) };
    case "scale": return { type, min: str(v, "min", at, true), ...(v.mid !== undefined ? { mid: str(v, "mid", at, true) } : {}), max: str(v, "max", at, true) };
    case "bar": return { type, color: str(v, "color", at, true) };
    default: return { type, format: checkFormat(v.format, `${at}.format`) };
  }
}

/** Validates the `cf` list of a sheet (`at` = "sheets[i].cf"). */
export function checkCf(raw: unknown, at: string): CfRule[] {
  if (!Array.isArray(raw)) throw new DktParseError(`${at} must be an array`);
  return raw.map((v, i) => {
    const here = `${at}[${i}]`;
    if (!isObj(v)) throw new DktParseError(`${here} must be an object`);
    if (typeof v.id !== "string" || !v.id) throw new DktParseError(`${here}.id must be a non-empty string`);
    return { id: v.id, range: str(v, "range", here), ...checkKind(v, here) } as CfRule;
  });
}
