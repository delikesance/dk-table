/** Text functions (LEFT, RIGHT, MID, LEN, TRIM, UPPER, LOWER, TEXT), same format as the builtins of functions.ts. */
import { err, isErr, type Value } from "./types";
import { toNum, toText } from "./values";
import type { Arg, Builtin } from "./functions";

/** Scalar view of an arg (range -> first cell, missing -> undefined). */
function scalar(a: Arg | undefined): Value | undefined {
  return Array.isArray(a) ? (a.length ? a[0] : "") : a;
}

/** Text of arg `i`, or the error it carries, or #VALUE! when missing. */
function textArg(args: Arg[], i: number): string | Value {
  const v = scalar(args[i]);
  if (v === undefined) return err("#VALUE!");
  return isErr(v) ? v : toText(v);
}

/** Integer >= `min` from arg `i` (default `def` when absent), else an error. */
function intArg(args: Arg[], i: number, min: number, def?: number): number | Value {
  const v = scalar(args[i]);
  if (v === undefined) return def === undefined ? err("#VALUE!") : def;
  const n = toNum(v);
  return isErr(n) || n < min ? (isErr(n) ? n : err("#VALUE!")) : Math.trunc(n);
}

/** Build a one-text-arg function; errors propagate. */
function unary(f: (s: string) => Value): Builtin {
  return (args) => {
    const s = textArg(args, 0);
    return typeof s === "string" ? f(s) : (s as Value);
  };
}

/** Build a (text, count) function with `count` defaulting to 1 and >= 0. */
function counted(f: (s: string, n: number) => string): Builtin {
  return (args) => {
    const s = textArg(args, 0);
    if (typeof s !== "string") return s as Value;
    const n = intArg(args, 1, 0, 1);
    return typeof n === "number" ? f(s, n) : n;
  };
}

/** Round half away from zero to `d` decimals, then fixed notation with decimal comma. */
function fixed(n: number, d: number): string {
  const f = 10 ** d;
  const r = (Math.sign(n) * Math.round(Math.abs(n) * f + 1e-9)) / f;
  return r.toFixed(d).replace(".", ",").replace(/^-0(,0*)?$/, "0$1");
}

/** Insert non-breaking spaces as thousands separators in an integer part. */
function group(s: string): string {
  const neg = s.startsWith("-");
  const [int, dec] = (neg ? s.slice(1) : s).split(",");
  const g = int.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return (neg ? "-" : "") + g + (dec === undefined ? "" : "," + dec);
}

/** Supported TEXT formats: "0", "0.00", "0%", "0.0%", "#,##0.00" (and variants). */
function formatText(n: number, fmt: string): Value {
  const m = /^(#,##)?0(?:\.(0+))?(%)?$/.exec(fmt.trim());
  if (!m) return err("#VALUE!");
  const d = m[2] ? m[2].length : 0;
  const s = fixed(m[3] ? n * 100 : n, d);
  return (m[1] ? group(s) : s) + (m[3] ? "%" : "");
}

/**
 * Text builtins to register by name: LEFT(t,[n]), RIGHT(t,[n]), MID(t,start,n),
 * LEN(t), TRIM(t) (collapses inner spaces), UPPER(t), LOWER(t), TEXT(value,format).
 * Numbers are coerced to text; negative counts give #VALUE!; errors propagate.
 */
export const textFunctions: Record<string, Builtin> = {
  LEFT: counted((s, n) => s.slice(0, n)),
  RIGHT: counted((s, n) => (n === 0 ? "" : s.slice(-n))),
  MID: (args) => {
    const s = textArg(args, 0);
    if (typeof s !== "string") return s as Value;
    const start = intArg(args, 1, 1);
    if (typeof start !== "number") return start;
    const n = intArg(args, 2, 0);
    return typeof n === "number" ? s.slice(start - 1, start - 1 + n) : n;
  },
  LEN: unary((s) => s.length),
  TRIM: unary((s) => s.trim().replace(/ +/g, " ")),
  UPPER: unary((s) => s.toUpperCase()),
  LOWER: unary((s) => s.toLowerCase()),
  TEXT: (args) => {
    const n = toNum(scalar(args[0]) ?? "");
    const f = textArg(args, 1);
    if (isErr(n)) return n;
    return typeof f === "string" ? formatText(n, f) : (f as Value);
  },
};
