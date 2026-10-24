/**
 * SUBTOTAL and AGGREGATE (Excel codes). Codes map to the registered builtins (AVERAGE, SUM, MEDIAN, LARGE...)
 * plus population variance/deviation and percentile/quartile helpers defined here.
 * AGGREGATE options 2, 3, 6, 7 drop error values from the refs before computing.
 * Limits: the engine has no hidden-row information, so SUBTOTAL 101-111 equal 1-11 and AGGREGATE
 * hidden-row options equal their visible counterparts; nested SUBTOTAL/AGGREGATE cells inside a
 * range are not skipped (Excel ignores them). Registered by wire.ts with `registerBuiltin`.
 */
import { collectNums, getFunction, type Arg, type Builtin } from "./functions";
import { err, isErr, type Value } from "./types";
import { numArg } from "./fn-args";
import { overNums, variance } from "./fn-stats";

/** Function names of codes 1-13 (SUBTOTAL uses 1-11). */
const BASE = ["AVERAGE", "COUNT", "COUNTA", "MAX", "MIN", "PRODUCT", "STDEV", "STDEVP", "SUM", "VAR", "VARP", "MEDIAN", "MODE"];

/** Population variance (`sqrt` for the deviation). */
function pop(sqrt: boolean): Builtin {
  return overNums((n) => {
    const v = variance(n, true);
    return sqrt && typeof v === "number" ? Math.sqrt(v) : v;
  });
}

/** Builtin of code 1-13, or undefined. */
function base(code: number): Builtin | undefined {
  const name = BASE[code - 1];
  if (name === "STDEVP") return pop(true);
  if (name === "VARP") return pop(false);
  return name ? getFunction(name) : undefined;
}

/** Interpolated percentile of sorted `n`: inclusive (h = (N-1)p) or exclusive (h = (N+1)p - 1); out of range -> #NUM!. */
function percentile(n: number[], p: number, exclusive: boolean): Value {
  const N = n.length;
  if (!N || p < 0 || p > 1 || (exclusive && (p <= 0 || p >= 1))) return err("#NUM!");
  const h = exclusive ? (N + 1) * p - 1 : (N - 1) * p;
  if (h < 0 || h > N - 1) return err("#NUM!");
  const lo = Math.floor(h);
  return lo + 1 < N ? n[lo] + (h - lo) * (n[lo + 1] - n[lo]) : n[lo];
}

/** Codes 14-19 on (data; k): LARGE, SMALL, PERCENTILE.INC, QUARTILE.INC, PERCENTILE.EXC, QUARTILE.EXC. */
function withK(code: number, data: Arg, kArg: Arg): Value {
  if (code === 14 || code === 15) return getFunction(code === 14 ? "LARGE" : "SMALL")!([data, kArg]);
  const n = collectNums([Array.isArray(data) ? data : [data]]);
  if (!Array.isArray(n)) return n as Value;
  const k = numArg([kArg], 0);
  if (typeof k !== "number") return k;
  n.sort((a, b) => a - b);
  const quart = code === 17 || code === 19;
  const q = Math.trunc(k);
  if (quart && (q < 0 || q > 4)) return err("#NUM!");
  return percentile(n, quart ? q / 4 : k, code >= 18);
}

/** Drop error values from an arg (a scalar error becomes an empty range). */
function noErrors(a: Arg): Arg {
  if (Array.isArray(a)) return a.filter((v) => !isErr(v));
  return isErr(a) ? [] : a;
}

/** Truncated integer code of arg 0 / 1, or the error. */
function code(args: Arg[], i: number): number | Value {
  const c = numArg(args, i);
  return typeof c === "number" ? Math.trunc(c) : c;
}

/** SUBTOTAL(function_num; ref1; ...): codes 1-11 and 101-111; errors in refs propagate. */
const subtotal: Builtin = (args) => {
  const c = code(args, 0);
  if (typeof c !== "number") return c;
  const f = (c >= 1 && c <= 11) || (c >= 101 && c <= 111) ? base(c % 100) : undefined;
  if (!f || args.length < 2) return err("#VALUE!");
  return f(args.slice(1));
};

/** AGGREGATE(function_num; options; ref1; ...|k): codes 1-19, options 0-7 (2, 3, 6, 7 ignore errors). */
const aggregate: Builtin = (args) => {
  const c = code(args, 0);
  if (typeof c !== "number") return c;
  const opt = code(args, 1);
  if (typeof opt !== "number") return opt;
  if (c < 1 || c > 19 || opt < 0 || opt > 7 || args.length < 3) return err("#VALUE!");
  const ignore = [2, 3, 6, 7].includes(opt);
  const refs = args.slice(2);
  if (c >= 14) {
    if (refs.length !== 2) return err("#VALUE!");
    return withK(c, ignore ? noErrors(refs[0]) : refs[0], refs[1]);
  }
  return base(c)!(ignore ? refs.map(noErrors) : refs);
};

/** Builtins keyed by upper-case name. */
export const subtotalFunctions: Record<string, Builtin> = {
  SUBTOTAL: subtotal,
  AGGREGATE: aggregate,
};
