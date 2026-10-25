/** Formula evaluator: walks a parsed AST against a sheet and returns a Value (errors propagate as #-codes). */
import { err, isErr, type Node, type Sheet, type Value } from "./types";
import { expandRange, inBounds } from "./address";
import { rectOf } from "./openrange";
import { getFunction, wantsMatrix, type Arg } from "./functions";
import { toBool, toNum, toText } from "./values";
import { resolveSheet } from "./book";
import { getState } from "./state";
import { LAZY_FORMS } from "./lazy";
import { expandUserCall } from "./userfnStore";
import { SPILL_FORMS, type SArg, type SpillResult } from "./fn-spill";

/** Reads the current computed value of a cell key ("" if empty). */
export type Getter = (key: string) => Value;

/** Rank of a value type for Excel-like ordering: number < text < boolean. */
const rank = (v: Value) => (typeof v === "number" ? 0 : typeof v === "string" ? 1 : 2);

/** Compare two non-error values; returns <0, 0, >0. */
function compare(a: Value, b: Value): number {
  if (a === "" && typeof b === "number") a = 0;
  if (b === "" && typeof a === "number") b = 0;
  if (a === "" && typeof b === "boolean") a = false;
  if (b === "" && typeof a === "boolean") b = false;
  if (rank(a) !== rank(b)) return rank(a) - rank(b);
  if (typeof a === "string") {
    const x = a.toLowerCase();
    const y = (b as string).toLowerCase();
    return x < y ? -1 : x > y ? 1 : 0;
  }
  return Number(a) - Number(b);
}

/** Apply a binary operator to two evaluated scalars. */
function binary(op: string, l: Value, r: Value): Value {
  if (isErr(l)) return l;
  if (isErr(r)) return r;
  if (op === "&") return toText(l) + toText(r);
  if (["=", "<>", "<", ">", "<=", ">="].includes(op)) {
    const c = compare(l, r);
    return { "=": c === 0, "<>": c !== 0, "<": c < 0, ">": c > 0, "<=": c <= 0, ">=": c >= 0 }[op]!;
  }
  const a = toNum(l);
  const b = toNum(r);
  if (isErr(a)) return a;
  if (isErr(b)) return b;
  let v: number;
  if (op === "+") v = a + b;
  else if (op === "-") v = a - b;
  else if (op === "*") v = a * b;
  else if (op === "/") {
    if (b === 0) return err("#DIV/0!");
    v = a / b;
  } else v = a ** b;
  return Number.isFinite(v) ? v : err("#VALUE!");
}

/** Values of the rectangle a:b of `sheet` (flat, or rows when `matrix`); #REF! when out of bounds. */
function rangeArg(sheet: Sheet, get: Getter, a: string, b: string, matrix: boolean): Arg {
  const r = rectOf(sheet, a, b, true);
  const keys = expandRange(sheet, a, b, true);
  if (!r || !keys) return err("#REF!");
  const vals = keys.map(get);
  if (!matrix) return vals;
  const w = r.c2 - r.c1 + 1;
  const rows: Value[][] = [];
  for (let i = 0; i < vals.length; i += w) rows.push(vals.slice(i, i + w));
  return rows as unknown as Arg;
}

/** Target sheet + value getter of a qualified ref, or undefined when the sheet is unknown. */
function external(from: Sheet, name: string): { sheet: Sheet; get: Getter } | undefined {
  const sheet = resolveSheet(from, name);
  if (!sheet) return undefined;
  const values = getState(sheet).values;
  return { sheet, get: (k) => values.get(k) ?? "" };
}

/** Evaluate a node to an argument: scalar, or Value[] for ranges. */
function evalArg(n: Node, sheet: Sheet, get: Getter, matrix = false): Arg {
  if (n.t === "range") return rangeArg(sheet, get, n.a, n.b, matrix);
  if (n.t === "xrange") {
    const x = external(sheet, n.sheet);
    return x ? rangeArg(x.sheet, x.get, n.a, n.b, matrix) : err("#REF!");
  }
  return evaluate(n, sheet, get);
}

/** Matrix view of a spill-function argument; an operator with a range operand is applied cell by cell (A1:A9>2). */
function spillArg(n: Node, sheet: Sheet, get: Getter): SArg {
  const isR = (x: Node) => x.t === "range" || x.t === "xrange";
  if (n.t !== "bin" || !(isR(n.l) || isR(n.r) || n.l.t === "bin" || n.r.t === "bin")) return evalArg(n, sheet, get, true) as SArg;
  const as = (x: SArg): Value[][] => (Array.isArray(x) ? x : [[x]]);
  const l = as(spillArg(n.l, sheet, get));
  const r = as(spillArg(n.r, sheet, get));
  const h = Math.max(l.length, r.length);
  const w = Math.max(l[0]?.length ?? 0, r[0]?.length ?? 0);
  const at = (m: Value[][], i: number, j: number) => m[m.length === 1 ? 0 : i]?.[m[0].length === 1 ? 0 : j] ?? "";
  return Array.from({ length: h }, (_, i) => Array.from({ length: w }, (_, j) => binary(n.op, at(l, i, j), at(r, i, j))));
}

/** Matrix result of a spill function call (SPLIT/UNIQUE/FILTER/SORT), or undefined for any other node. */
export function spillResult(n: Node, sheet: Sheet, get: Getter): SpillResult | undefined {
  const f = n.t === "call" ? SPILL_FORMS[n.name] : undefined;
  return f && n.t === "call" ? f(n.args.map((a) => spillArg(a, sheet, get))) : undefined;
}

/**
 * IFERROR(value, if_error) / IFNA(value, if_na): lazy, the fallback is only evaluated
 * when needed. IFERROR catches every error (incl. #CYCLE!); IFNA only #N/A.
 */
function lazyCatch(n: Extract<Node, { t: "call" }>, sheet: Sheet, get: Getter): Value {
  if (n.args.length !== 2) return err("#VALUE!");
  const v = evaluate(n.args[0], sheet, get);
  if (!isErr(v) || (n.name === "IFNA" && v.error !== "#N/A")) return v;
  return evaluate(n.args[1], sheet, get);
}

/** Profondeur d'imbrication des fonctions nommées (garde contre la récursion infinie). */
let userDepth = 0;

/** Appel d'une fonction nommée : corps évalué avec arguments substitués ; inconnue -> #NAME?. */
function userCall(n: Extract<Node, { t: "call" }>, sheet: Sheet, get: Getter): Value {
  const body = expandUserCall(n);
  if (!body) return err("#NAME?");
  if (userDepth > 40) return err("#VALUE!");
  userDepth++;
  try { return evaluate(body, sheet, get); } finally { userDepth--; }
}

/** Evaluate an AST to a scalar value (a bare range is #VALUE!). */
export function evaluate(n: Node, sheet: Sheet, get: Getter): Value {
  switch (n.t) {
    case "num":
    case "str":
    case "bool":
      return n.v;
    case "err":
      return err(n.code);
    case "ref":
      return inBounds(sheet, n.key) ? get(n.key) : err("#REF!");
    case "xref": {
      const x = external(sheet, n.sheet);
      return x && inBounds(x.sheet, n.key) ? x.get(n.key) : err("#REF!");
    }
    case "range":
    case "xrange": {
      const v = evalArg(n, sheet, get);
      return isErr(v) ? v : err("#VALUE!");
    }
    case "neg": {
      const v = toNum(evaluate(n.e, sheet, get));
      return isErr(v) ? v : -v;
    }
    case "pct": {
      const v = toNum(evaluate(n.e, sheet, get));
      return isErr(v) ? v : v / 100;
    }
    case "bin":
      return binary(n.op, evaluate(n.l, sheet, get), evaluate(n.r, sheet, get));
    case "call": {
      if (n.name === "IF") {
        // Lazy: only the taken branch is evaluated.
        if (n.args.length < 2 || n.args.length > 3) return err("#VALUE!");
        const c = toBool(evaluate(n.args[0], sheet, get));
        if (isErr(c)) return c;
        const br = c ? n.args[1] : n.args[2];
        return br ? evaluate(br, sheet, get) : false;
      }
      if (n.name === "IFERROR" || n.name === "IFNA") return lazyCatch(n, sheet, get);
      const sp = spillResult(n, sheet, get);
      if (sp) return Array.isArray(sp) ? (sp[0]?.[0] ?? "") : sp;
      const lazy = LAZY_FORMS[n.name];
      if (lazy) return lazy(n.args, (a) => evaluate(a, sheet, get));
      const fn = getFunction(n.name);
      if (!fn) return userCall(n, sheet, get);
      const mx = wantsMatrix(n.name);
      return fn(n.args.map((a) => evalArg(a, sheet, get, mx)));
    }
  }
}
