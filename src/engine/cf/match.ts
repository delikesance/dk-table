/** Per-cell predicates of the « classic » conditional formatting rules (all but scale / bar). */
import type { Value } from "../types";
import { isErr } from "../types";
import { isDecimal, toBool, toText } from "../values";
import { parseKey } from "../address";
import { shiftFormula } from "../refs";
import type { CfEnv } from "./env";
import type { CfKind, CfOp } from "./types";

/** Predicate on a cell value (and its key, for formula rules). */
export type CfTest = (v: Value, key: string) => boolean;

/** Rule types handled here. */
type Classic = Exclude<CfKind, { type: "scale" } | { type: "bar" }>;

/** Operand of a value rule: `=formula` (evaluated once), number (decimal comma accepted) or text. */
export function operand(s: string, env: CfEnv): Value {
  const t = s.trim();
  if (t.startsWith("=")) return env.evaluate(t);
  const n = t.replace(/^(-?\d+),(\d+)$/, "$1.$2");
  return isDecimal(n) && Number.isFinite(Number(n)) ? Number(n) : t;
}

/** Order of two values of the same kind (text case-insensitive); null when not comparable. */
function cmp(v: Value, o: Value): number | null {
  if (isErr(v) || isErr(o)) return null;
  if (typeof v === "number" && typeof o === "number") return v - o;
  if (typeof v === "number" || typeof o === "number") return null;
  const x = toText(v).toLowerCase(), y = toText(o).toLowerCase();
  return x < y ? -1 : x > y ? 1 : 0;
}

/** Comparison of a « Valeur de la cellule » rule; empty cells never match. */
function cellTest(op: CfOp, a: Value, b: Value): CfTest {
  const [lo, hi] = (cmp(a, b) ?? 0) > 0 ? [b, a] : [a, b];
  return (v) => {
    if (v === "" || isErr(v)) return false;
    const c = cmp(v, a);
    switch (op) {
      case "eq": return c === 0;
      case "ne": return c !== 0;
      case "gt": return c !== null && c > 0;
      case "ge": return c !== null && c >= 0;
      case "lt": return c !== null && c < 0;
      case "le": return c !== null && c <= 0;
      default: {
        const l = cmp(v, lo), h = cmp(v, hi);
        const inside = l !== null && h !== null && l >= 0 && h <= 0;
        return op === "between" ? inside : l !== null && h !== null && !inside;
      }
    }
  };
}

/** Numbers among the values of `keys`. */
const numbers = (keys: string[], env: CfEnv): number[] =>
  keys.map((k) => env.read(k)).filter((v): v is number => typeof v === "number");

/** Identity of a value for duplicate detection (numbers by value, text case-insensitive). */
const ident = (v: Value): string => (typeof v === "number" ? `n${v}` : `s${toText(v).toLowerCase()}`);

/** Duplicate (`dup` = true) or unique values among non-empty, non-error cells. */
function dupTest(keys: string[], env: CfEnv, dup: boolean): CfTest {
  const count = new Map<string, number>();
  for (const k of keys) {
    const v = env.read(k);
    if (v !== "" && !isErr(v)) count.set(ident(v), (count.get(ident(v)) ?? 0) + 1);
  }
  return (v) => v !== "" && !isErr(v) && (count.get(ident(v))! > 1) === dup;
}

/** Top/bottom n (or n %) numeric values; ties with the threshold are included. */
function rankTest(keys: string[], env: CfEnv, top: boolean, n: number, percent?: boolean): CfTest {
  const nums = numbers(keys, env).sort((x, y) => (top ? y - x : x - y));
  const want = Math.min(nums.length, percent ? Math.max(1, Math.floor((nums.length * n) / 100)) : Math.floor(n));
  if (want < 1) return () => false;
  const t = nums[want - 1];
  return (v) => typeof v === "number" && (top ? v >= t : v <= t);
}

/** Formula rule: written for the top-left cell of the range, shifted for each cell. */
function formulaTest(formula: string, keys: string[], env: CfEnv): CfTest {
  const a = parseKey(keys[0])!;
  const f = formula.trim().startsWith("=") ? formula.trim() : `=${formula.trim()}`;
  return (_v, key) => {
    const p = parseKey(key)!;
    const r = toBool(env.evaluate(shiftFormula(f, p.col - a.col, p.row - a.row)));
    return r === true;
  };
}

/** Build the predicate of a classic rule over its (non-empty) list of cells. */
export function ruleTest(rule: Classic, keys: string[], env: CfEnv): CfTest {
  switch (rule.type) {
    case "cell": return cellTest(rule.op, operand(rule.a, env), operand(rule.b ?? "", env));
    case "text": {
      const s = rule.text.toLowerCase();
      const has = (v: Value) => !isErr(v) && v !== "";
      const t = (v: Value) => toText(v).toLowerCase();
      if (rule.op === "contains") return (v) => has(v) && t(v).includes(s);
      if (rule.op === "notContains") return (v) => has(v) && !t(v).includes(s);
      if (rule.op === "begins") return (v) => has(v) && t(v).startsWith(s);
      return (v) => has(v) && t(v).endsWith(s);
    }
    case "blank": return (v) => v === "";
    case "notBlank": return (v) => v !== "";
    case "error": return (v) => isErr(v);
    case "noError": return (v) => !isErr(v);
    case "duplicate": return dupTest(keys, env, true);
    case "unique": return dupTest(keys, env, false);
    case "top": case "bottom": return rankTest(keys, env, rule.type === "top", rule.n, rule.percent);
    case "aboveAvg": case "belowAvg": {
      const nums = numbers(keys, env);
      const avg = nums.reduce((s, x) => s + x, 0) / nums.length;
      const above = rule.type === "aboveAvg";
      return (v) => typeof v === "number" && (above ? v > avg : v < avg);
    }
    case "formula": return formulaTest(rule.formula, keys, env);
  }
}
