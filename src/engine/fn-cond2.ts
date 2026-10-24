/**
 * Conditional aggregates: AVERAGEIF, AVERAGEIFS, MINIFS, MAXIFS. Same criteria engine
 * as fn-cond.ts (">5", "<>x", wildcards * ? ~). Registered with `{ matrix: true }`.
 */
import type { Arg, Builtin } from "./functions";
import { err, isErr, type Value } from "./types";
import { list, matches, resize } from "./fn-cond";

/** Numbers of `vals` at `idx` (text/blank skipped), or the first error met. */
function numsAt(vals: Value[], idx: number[]): number[] | Value {
  const out: number[] = [];
  for (const k of idx) {
    const v = vals[k];
    if (isErr(v)) return v;
    if (typeof v === "number") out.push(v);
  }
  return out;
}

/** Reduce the matched numbers of `vals` with `f` (match result may be an error). */
function over(vals: Value[], idx: number[] | Value, f: (n: number[]) => Value): Value {
  if (!Array.isArray(idx)) return idx;
  const n = numsAt(vals, idx);
  return Array.isArray(n) ? f(n) : (n as Value);
}

const mean = (n: number[]): Value => (n.length ? n.reduce((a, b) => a + b, 0) / n.length : err("#DIV/0!"));

/** Build a `(target, range1, crit1, ...)` aggregate (AVERAGEIFS, MINIFS, MAXIFS). */
function multi(f: (n: number[]) => Value): Builtin {
  return (args: Arg[]) => {
    if (args.length < 3) return err("#VALUE!");
    const vals = list(args[0]);
    if (list(args[1]).length !== vals.length) return err("#VALUE!");
    return over(vals, matches(args, 1), f);
  };
}

/** AVERAGEIF(range; criterion[; avg_range]): mean where range matches; none -> #DIV/0!. */
const AVERAGEIF: Builtin = (args) => {
  if (args.length < 2 || args.length > 3) return err("#VALUE!");
  const vals = args.length === 3 ? resize(args[2], args[0]) : list(args[0]);
  if (vals.length !== list(args[0]).length) return err("#VALUE!");
  return over(vals, matches(args.slice(0, 2), 0), mean);
};

/** Conditional aggregate lot, keyed by upper-case name. */
export const cond2Functions: Record<string, Builtin> = {
  AVERAGEIF,
  AVERAGEIFS: multi(mean),
  MINIFS: multi((n) => (n.length ? Math.min(...n) : 0)),
  MAXIFS: multi((n) => (n.length ? Math.max(...n) : 0)),
};
