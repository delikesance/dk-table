/**
 * Logical / information functions: AND, OR, XOR, NOT, ISNUMBER, ISBLANK.
 *
 * Exported as `logicFunctions` (name -> Builtin, same shape as the registry in
 * functions.ts); to be wired there with `for (const [k, v] of Object.entries(logicFunctions)) def(k, v)`.
 *
 * Known limit: the evaluator represents an empty cell as "" (same as an empty
 * text result), so ISBLANK cannot tell a truly empty cell from a cell holding "".
 */
import { err, isErr, type Value } from "./types";
import { toBool } from "./values";
import type { Arg, Builtin } from "./functions";

/**
 * Collect booleans from args. Range cells: booleans/numbers only (text/blank ignored).
 * Scalars: coerced via toBool. First error is returned; no logical value -> #VALUE!.
 */
function collectBools(args: Arg[]): boolean[] | Value {
  const out: boolean[] = [];
  for (const a of args) {
    if (Array.isArray(a)) {
      for (const v of a) {
        if (isErr(v)) return v;
        if (typeof v === "boolean" || typeof v === "number") out.push(typeof v === "number" ? v !== 0 : v);
      }
    } else {
      const b = toBool(a);
      if (typeof b !== "boolean") return b;
      out.push(b);
    }
  }
  return out.length ? out : err("#VALUE!");
}

/** First arg as a scalar (range -> its first cell; missing -> #VALUE!). */
function scalar(args: Arg[]): Value {
  const a = args[0];
  if (a === undefined) return err("#VALUE!");
  return Array.isArray(a) ? (a.length ? a[0] : "") : a;
}

/** Build AND/OR from a reducer over the collected booleans. */
function reduceBools(f: (b: boolean[]) => boolean): Builtin {
  return (args) => {
    const b = collectBools(args);
    return Array.isArray(b) ? f(b) : (b as Value);
  };
}

/** Logical/info functions keyed by upper-case name. */
export const logicFunctions: Record<string, Builtin> = {
  /** AND(a, b, ...): TRUE if every logical value is true. */
  AND: reduceBools((b) => b.every(Boolean)),
  /** OR(a, b, ...): TRUE if any logical value is true. */
  OR: reduceBools((b) => b.some(Boolean)),
  /** XOR(a, b, ...): TRUE if an odd number of logical values are true. */
  XOR: reduceBools((b) => b.filter(Boolean).length % 2 === 1),
  /** NOT(x): logical negation of one value. */
  NOT: (args) => {
    const b = toBool(scalar(args));
    return typeof b === "boolean" ? !b : b;
  },
  /** ISNUMBER(x): TRUE if x is a number (text, blank, boolean, error -> FALSE). */
  ISNUMBER: (args) => typeof scalar(args) === "number",
  /** ISBLANK(x): TRUE if x is empty ("" -- see module limit). */
  ISBLANK: (args) => scalar(args) === "",
};
