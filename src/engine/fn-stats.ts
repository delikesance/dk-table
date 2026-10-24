/**
 * Statistics builtins: COUNTBLANK, MODE, VAR, STDEV (sample), LARGE, SMALL, RANK.
 * Ranges ignore text/blank cells (collectNums rules). Registered by wire.ts.
 */
import { collectNums, type Arg, type Builtin } from "./functions";
import { err, isErr, type Value } from "./types";
import { cells, numArg } from "./fn-args";

/** Build a builtin over the numbers of all args. */
function overNums(f: (n: number[]) => Value): Builtin {
  return (args) => {
    const n = collectNums(args);
    return Array.isArray(n) ? f(n) : (n as Value);
  };
}

/** Sample variance; fewer than 2 numbers -> #DIV/0!. */
function variance(n: number[]): Value {
  if (n.length < 2) return err("#DIV/0!");
  const m = n.reduce((a, b) => a + b, 0) / n.length;
  return n.reduce((a, b) => a + (b - m) ** 2, 0) / (n.length - 1);
}

/** Most frequent number (first one seen on ties); no repeated value -> #N/A. */
function mode(n: number[]): Value {
  const count = new Map<number, number>();
  let best: number | null = null;
  let bestC = 1;
  for (const x of n) {
    const c = (count.get(x) ?? 0) + 1;
    count.set(x, c);
    if (c > bestC) [best, bestC] = [x, c];
  }
  if (best === null) return err("#N/A");
  // Ties: first value (in order) reaching the top count.
  for (const x of n) if (count.get(x) === bestC) return x;
  return best;
}

/** LARGE/SMALL(range; k): k-th largest/smallest; k outside 1..n -> #NUM!. */
function kth(largest: boolean): Builtin {
  return (args) => {
    if (args.length !== 2) return err("#VALUE!");
    const n = collectNums([args[0]]);
    if (!Array.isArray(n)) return n as Value;
    const k = numArg(args, 1);
    if (typeof k !== "number") return k;
    const i = Math.ceil(k);
    if (i < 1 || i > n.length) return err("#NUM!");
    n.sort((a, b) => (largest ? b - a : a - b));
    return n[i - 1];
  };
}

/** RANK(x; ref[; order=0]): position of x (0 = descending); ties share the best rank; absent -> #N/A. */
const rank: Builtin = (args) => {
  if (args.length < 2 || args.length > 3) return err("#VALUE!");
  const x = numArg(args, 0);
  if (typeof x !== "number") return x;
  const n = collectNums([args[1]]);
  if (!Array.isArray(n)) return n as Value;
  const order = numArg(args, 2, 0);
  if (typeof order !== "number") return order;
  if (!n.includes(x)) return err("#N/A");
  return 1 + n.filter((v) => (order === 0 ? v > x : v < x)).length;
};

/** COUNTBLANK(range): number of empty cells (empty text included). */
const countblank: Builtin = (args: Arg[]) => {
  if (args.length !== 1) return err("#VALUE!");
  return cells(args[0]).filter((v) => !isErr(v) && v === "").length;
};

/** Builtins keyed by upper-case name. */
export const statsFunctions: Record<string, Builtin> = {
  COUNTBLANK: countblank,
  MODE: overNums(mode),
  VAR: overNums(variance),
  STDEV: overNums((n) => {
    const v = variance(n);
    return typeof v === "number" ? Math.sqrt(v) : v;
  }),
  LARGE: kth(true),
  SMALL: kth(false),
  RANK: rank,
};
