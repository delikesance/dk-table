/** Conditional functions: SUMIF, SUMIFS, COUNTIF, COUNTIFS with Excel-style criteria. */
import type { Arg, Builtin } from "./functions";
import { err, isErr, type Value } from "./types";
import { toText } from "./values";

/** Compiled criterion: predicate on a cell value. */
type Pred = (v: Value) => boolean;

/** Regex from an Excel wildcard pattern (`*`, `?`, `~` escape), case-insensitive, anchored. */
function wildcard(p: string): RegExp {
  return new RegExp(`^${wildcardSource(p)}$`, "i");
}

/** Unanchored regex source of an Excel wildcard pattern (also used by SEARCH). */
export function wildcardSource(p: string): string {
  let re = "";
  for (let i = 0; i < p.length; i++) {
    const c = p[i];
    if (c === "~" && i + 1 < p.length) re += p[++i].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    else if (c === "*") re += "[\\s\\S]*";
    else if (c === "?") re += "[\\s\\S]";
    else re += c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  return re;
}

/** Numeric value of a string if it is a plain decimal number, else null. */
function asNum(s: string): number | null {
  return s.trim() !== "" && /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s.trim()) ? Number(s) : null;
}

/** Build a predicate from a criterion: number, text, or operator form (">5", "<>x", "=a*"). */
function compile(crit: Value): Pred {
  if (typeof crit === "number") return (v) => typeof v === "number" && v === crit;
  if (typeof crit === "boolean") return (v) => v === crit;
  const m = /^(>=|<=|<>|>|<|=)?([\s\S]*)$/.exec(toText(crit)) as RegExpExecArray;
  const op = m[1] ?? "=";
  const rhs = m[2];
  const n = asNum(rhs);
  if (n !== null && op !== "=" && op !== "<>") {
    return (v) => {
      if (typeof v !== "number") return false;
      return op === ">" ? v > n : op === "<" ? v < n : op === ">=" ? v >= n : v <= n;
    };
  }
  const eq: Pred =
    n !== null
      ? (v) => (typeof v === "number" ? v === n : typeof v === "string" && asNum(v) === n)
      : rhs === ""
        ? (v) => v === ""
        : ((re) => (v: Value) => typeof v === "string" && re.test(v))(wildcard(rhs));
  if (op === "<>") return (v) => !eq(v);
  if (op === "=") return eq;
  // Text comparison for ordering operators.
  const r = rhs.toLowerCase();
  return (v) => {
    if (typeof v !== "string") return false;
    const s = v.toLowerCase();
    return op === ">" ? s > r : op === "<" ? s < r : op === ">=" ? s >= r : s <= r;
  };
}

/** Scalar view of an argument (first cell of a range, matrix or flat). */
function scalar(a: Arg): Value {
  return list(a)[0] ?? "";
}

/** Row-major flat view of an argument: scalar = one cell, matrix (rows) flattened. */
export function list(a: Arg): Value[] {
  return Array.isArray(a) ? (a as unknown[]).flat() as Value[] : [a];
}

/** Height and width of a matrix arg (flat list = one column, scalar = 1x1). */
function dims(a: Arg): [number, number] {
  if (!Array.isArray(a)) return [1, 1];
  return Array.isArray(a[0]) ? [a.length, (a[0] as Value[]).length] : [a.length, 1];
}

/** `sum` re-read with the shape of `rng` anchored at its top-left (Excel SUMIF sum_range rule). */
export function resize(sum: Arg, rng: Arg): Value[] {
  const [h, w] = dims(rng);
  const rows = (Array.isArray(sum) ? sum : [sum]) as unknown[];
  if (!Array.isArray(rows[0])) return list(sum);
  const out: Value[] = [];
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) out.push(((rows[r] as Value[] | undefined) ?? [])[c] ?? "");
  return out;
}

/**
 * Evaluate (range, criterion) pairs from `args` (starting at `from`); returns the matching
 * row indexes, or an error value (odd arg count, size mismatch, error criterion).
 */
export function matches(args: Arg[], from: number): number[] | Value {
  const n = args.length - from;
  if (n < 2 || n % 2 !== 0) return err("#VALUE!");
  const first = list(args[from]);
  const preds: [Value[], Pred][] = [];
  for (let i = from; i < args.length; i += 2) {
    const rng = list(args[i]);
    const crit = scalar(args[i + 1]);
    if (isErr(crit)) return crit;
    if (rng.length !== first.length) return err("#VALUE!");
    preds.push([rng, compile(crit)]);
  }
  const out: number[] = [];
  for (let k = 0; k < first.length; k++) if (preds.every(([r, p]) => p(r[k]))) out.push(k);
  return out;
}

/** Sum numeric cells of `sum` at the given indexes (errors propagate, text ignored). */
function sumAt(sum: Value[], idx: number[]): Value {
  let t = 0;
  for (const k of idx) {
    const v = sum[k];
    if (isErr(v)) return v;
    if (typeof v === "number") t += v;
  }
  return t;
}

/** COUNTIF(range, criterion): count cells matching the criterion. */
const COUNTIF: Builtin = (args) => {
  if (args.length !== 2) return err("#VALUE!");
  const r = matches(args, 0);
  return Array.isArray(r) ? r.length : (r as Value);
};

/** COUNTIFS(range1, crit1, ...): count rows matching all criteria. */
const COUNTIFS: Builtin = (args) => {
  const r = matches(args, 0);
  return Array.isArray(r) ? r.length : (r as Value);
};

/** SUMIF(range, criterion[, sum_range]): sum sum_range (default range) where range matches. */
const SUMIF: Builtin = (args) => {
  if (args.length < 2 || args.length > 3) return err("#VALUE!");
  const r = matches(args.slice(0, 2), 0);
  if (!Array.isArray(r)) return r as Value;
  const sum = args.length === 3 ? resize(args[2], args[0]) : list(args[0]);
  if (sum.length !== list(args[0]).length) return err("#VALUE!");
  return sumAt(sum, r);
};

/** SUMIFS(sum_range, range1, crit1, ...): sum sum_range where all criteria match. */
const SUMIFS: Builtin = (args) => {
  if (args.length < 3) return err("#VALUE!");
  const sum = list(args[0]);
  if (list(args[1]).length !== sum.length) return err("#VALUE!");
  const r = matches(args, 1);
  return Array.isArray(r) ? sumAt(sum, r) : (r as Value);
};

/** Conditional function lot, registered like the other function lots. */
export const condFunctions: Record<string, Builtin> = { SUMIF, SUMIFS, COUNTIF, COUNTIFS };
