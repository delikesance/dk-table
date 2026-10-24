/**
 * Lazy special forms IFS and SWITCH: arguments are AST nodes evaluated on demand (only
 * the taken branch runs, like IF). Called from evaluator.ts via `LAZY_FORMS`.
 */
import { err, isErr, type Node, type Value } from "./types";
import { toBool } from "./values";

/** Evaluates one argument node to a scalar. */
export type Ev = (n: Node) => Value;

/** Case-insensitive equality for SWITCH (numbers, text, booleans; types must match). */
function same(a: Value, b: Value): boolean {
  if (typeof a === "string" && typeof b === "string") return a.toLowerCase() === b.toLowerCase();
  return a === b;
}

/** IFS(cond1; value1; ...): value of the first true condition; none -> #N/A; odd args -> #VALUE!. */
function ifs(args: Node[], ev: Ev): Value {
  if (!args.length || args.length % 2) return err("#VALUE!");
  for (let i = 0; i < args.length; i += 2) {
    const c = toBool(ev(args[i]));
    if (isErr(c)) return c;
    if (c) return ev(args[i + 1]);
  }
  return err("#N/A");
}

/** SWITCH(expr; v1; r1; ...[; default]): result paired with the first equal value; none -> default or #N/A. */
function sw(args: Node[], ev: Ev): Value {
  if (args.length < 3) return err("#VALUE!");
  const x = ev(args[0]);
  if (isErr(x)) return x;
  let i = 1;
  for (; i + 1 < args.length; i += 2) {
    const v = ev(args[i]);
    if (isErr(v)) return v;
    if (same(x, v)) return ev(args[i + 1]);
  }
  return i < args.length ? ev(args[i]) : err("#N/A");
}

/** Lazy forms by upper-case name. */
export const LAZY_FORMS: Record<string, (args: Node[], ev: Ev) => Value> = { IFS: ifs, SWITCH: sw };
