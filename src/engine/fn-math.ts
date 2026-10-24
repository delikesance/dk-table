/**
 * Extra math/stat builtins: PRODUCT, MOD, MEDIAN, COUNTA.
 * Same format as functions.ts builtins (`Builtin`: evaluated args -> Value);
 * wire them into the registry at integration.
 */
import { collectNums, type Arg, type Builtin } from "./functions";
import { err, isErr, type Value } from "./types";
import { toNum } from "./values";

/** PRODUCT(a;...): product of numbers (range text/blank ignored); 0 if none. */
const product: Builtin = (args) => {
  const n = collectNums(args);
  if (!Array.isArray(n)) return n as Value;
  return n.length ? n.reduce((a, b) => a * b, 1) : 0;
};

/** MOD(n;d): remainder with the sign of d; d=0 -> #DIV/0!. */
const mod: Builtin = (args) => {
  if (args.length !== 2) return err("#VALUE!");
  const [a, b] = args.map((x: Arg) => toNum(Array.isArray(x) ? (x[0] ?? "") : x));
  if (typeof a !== "number") return a;
  if (typeof b !== "number") return b;
  if (b === 0) return err("#DIV/0!");
  return a - b * Math.floor(a / b);
};

/** MEDIAN(a;...): middle value (mean of the two middles); none -> #VALUE!. */
const median: Builtin = (args) => {
  const n = collectNums(args);
  if (!Array.isArray(n)) return n as Value;
  if (!n.length) return err("#VALUE!");
  n.sort((x, y) => x - y);
  const m = n.length >> 1;
  return n.length % 2 ? n[m] : (n[m - 1] + n[m]) / 2;
};

/** COUNTA(a;...): count of non-empty values (text and errors included). */
const counta: Builtin = (args) => {
  let c = 0;
  for (const a of args)
    for (const v of Array.isArray(a) ? a : [a]) if (isErr(v) || v !== "") c++;
  return c;
};

/** Builtins to register, keyed by upper-case name. */
export const mathFunctions: Record<string, Builtin> = {
  PRODUCT: product,
  MOD: mod,
  MEDIAN: median,
  COUNTA: counta,
};
