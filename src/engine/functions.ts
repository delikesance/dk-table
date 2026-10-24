import { err, isErr, type Value } from "./types";
import { toNum, toText } from "./values";

/** Evaluated argument: scalar, or a flattened range of cell values. */
export type Arg = Value | Value[];
/** Internal builtin: receives evaluated args. */
export type Builtin = (args: Arg[]) => Value;
/** Plug-in function: receives all numeric args flattened; returns text or number. */
export type NumFn = (nums: number[]) => string | number;

const registry = new Map<string, Builtin>();

/**
 * Collect numbers from args. Range cells: numbers only (text/blank ignored).
 * Scalars: coerced (non-numeric text -> #VALUE!). First error is returned.
 */
export function collectNums(args: Arg[]): number[] | Value {
  const out: number[] = [];
  for (const a of args) {
    if (Array.isArray(a)) {
      for (const v of a) {
        if (isErr(v)) return v;
        if (typeof v === "number") out.push(v);
      }
    } else {
      const n = toNum(a);
      if (isErr(n)) return n;
      out.push(n);
    }
  }
  return out;
}

/** Register (or replace) a function by name (case-insensitive) on raw args. */
function def(name: string, fn: Builtin): void {
  registry.set(name.toUpperCase(), fn);
}

/**
 * Public plug-in API: register a function taking flattened number[] of all
 * args (ranges expanded) and returning string|number. Errors in args propagate.
 */
export function registerFunction(name: string, fn: NumFn): void {
  def(name, (args) => {
    const nums = collectNums(args);
    return Array.isArray(nums) ? fn(nums) : (nums as Value);
  });
}

/** Look up a function by (upper-case) name. */
export function getFunction(name: string): Builtin | undefined {
  return registry.get(name.toUpperCase());
}

/** Build an aggregate over the numeric args. */
function agg(f: (n: number[]) => Value): Builtin {
  return (args) => {
    const n = collectNums(args);
    return Array.isArray(n) ? f(n) : (n as Value);
  };
}

def("SUM", agg((n) => n.reduce((a, b) => a + b, 0)));
def("AVERAGE", agg((n) => (n.length ? n.reduce((a, b) => a + b, 0) / n.length : err("#DIV/0!"))));
def("MIN", agg((n) => (n.length ? Math.min(...n) : 0)));
def("MAX", agg((n) => (n.length ? Math.max(...n) : 0)));
def("COUNT", (args) => {
  let c = 0;
  for (const a of args) {
    if (Array.isArray(a)) {
      for (const v of a) if (typeof v === "number") c++;
    } else if (typeof a === "number" || (!isErr(a) && typeof toNum(a) === "number")) c++;
  }
  return c;
});
def("ABS", (args) => {
  const n = toNum(first(args));
  return isErr(n) ? n : Math.abs(n);
});
def("ROUND", (args) => {
  const n = toNum(first(args));
  const d = toNum(args[1] === undefined ? 0 : first(args.slice(1)));
  if (isErr(n)) return n;
  if (isErr(d)) return d;
  const f = 10 ** Math.trunc(d);
  return (Math.sign(n) * Math.round(Math.abs(n) * f + 1e-9)) / f;
});
def("CONCAT", (args) => {
  let s = "";
  for (const a of args)
    for (const v of Array.isArray(a) ? a : [a]) {
      if (isErr(v)) return v;
      s += toText(v);
    }
  return s;
});

/** First arg as scalar (range -> its first cell; missing -> #VALUE!). */
function first(args: Arg[]): Value {
  const a = args[0];
  if (a === undefined) return err("#VALUE!");
  return Array.isArray(a) ? (a.length ? a[0] : "") : a;
}
