/**
 * Argument helpers shared by the fn-*2 / fn-info / fn-stats modules: scalar views,
 * numeric coercion with defaults, and finite-result guarding (#NUM!).
 */
import { err, isErr, type Value } from "./types";
import { toNum, toText } from "./values";
import type { Arg } from "./functions";

/** Scalar view of an arg: range (flat or matrix) -> its first cell, missing -> undefined. */
export function scalarOf(a: Arg | undefined): Value | undefined {
  if (!Array.isArray(a)) return a;
  const f = (a as unknown[]).flat() as Value[];
  return f.length ? f[0] : "";
}

/** Number from arg `i` (default `def` when absent); errors or #VALUE! otherwise. */
export function numArg(args: Arg[], i: number, def?: number): number | Value {
  const v = scalarOf(args[i]);
  if (v === undefined) return def === undefined ? err("#VALUE!") : def;
  return toNum(v);
}

/** Text from arg `i` (default `def` when absent); errors propagate. */
export function textArg(args: Arg[], i: number, def?: string): string | Value {
  const v = scalarOf(args[i]);
  if (v === undefined) return def === undefined ? err("#VALUE!") : def;
  return isErr(v) ? v : toText(v);
}

/**
 * Read numeric args `0..n-1` then call `f`; first error wins.
 * `defs[i]` gives the default of an optional arg; more args than `n` -> #VALUE!.
 */
export function withNums(n: number, f: (x: number[]) => Value, defs: (number | undefined)[] = []): (args: Arg[]) => Value {
  return (args) => {
    if (args.length > n) return err("#VALUE!");
    const xs: number[] = [];
    for (let i = 0; i < n; i++) {
      const v = numArg(args, i, defs[i]);
      if (typeof v !== "number") return v;
      xs.push(v);
    }
    return f(xs);
  };
}

/** Finite number or #NUM! (overflow, NaN). */
export function fin(v: number): Value {
  return Number.isFinite(v) ? v : err("#NUM!");
}

/** All cells of an arg as a flat list (scalar -> one cell). */
export function cells(a: Arg | undefined): Value[] {
  if (a === undefined) return [];
  return Array.isArray(a) ? ((a as unknown[]).flat() as Value[]) : [a];
}
