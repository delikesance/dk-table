/**
 * Information / constant builtins: TRUE(), FALSE(), NA(), ISERROR, ISERR, ISNA, ISTEXT,
 * ISLOGICAL. The IS* functions receive error values as-is (the evaluator does not
 * short-circuit builtin args). Registered by wire.ts with `registerBuiltin`.
 */
import type { Builtin } from "./functions";
import { err, isErr, type Value } from "./types";
import { scalarOf } from "./fn-args";

/** Build a one-argument predicate over a scalar value; wrong arity -> #VALUE!. */
function is(p: (v: Value) => boolean): Builtin {
  return (args) => (args.length !== 1 ? err("#VALUE!") : p(scalarOf(args[0]) as Value));
}

/** Build a zero-argument constant. */
function constant(v: () => Value): Builtin {
  return (args) => (args.length ? err("#VALUE!") : v());
}

/** Info builtins keyed by upper-case name. */
export const infoFunctions: Record<string, Builtin> = {
  TRUE: constant(() => true),
  FALSE: constant(() => false),
  NA: constant(() => err("#N/A")),
  ISERROR: is((v) => isErr(v)),
  ISERR: is((v) => isErr(v) && v.error !== "#N/A"),
  ISNA: is((v) => isErr(v) && v.error === "#N/A"),
  ISTEXT: is((v) => typeof v === "string" && v !== ""),
  ISLOGICAL: is((v) => typeof v === "boolean"),
};
