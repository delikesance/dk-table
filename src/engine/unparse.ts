/** Unparse: AST back to formula text (parentheses added where precedence needs them), and text normalisation for matching. */
import type { Node } from "./types";

/** Binary operator precedence, same levels as the parser (comparisons < & < + - < * / < ^). */
const PREC: Record<string, number> = {
  "=": 0, "<>": 0, "<": 0, ">": 0, "<=": 0, ">=": 0,
  "&": 1, "+": 2, "-": 2, "*": 3, "/": 3, "^": 4,
};

/** Precedence of a node: binary ops by PREC, unary minus 5, postfix % 6, everything else 7. */
function prec(n: Node): number {
  if (n.t === "bin") return PREC[n.op] ?? 0;
  if (n.t === "neg") return 5;
  if (n.t === "pct") return 6;
  return 7;
}

/** Sheet name as typed in a formula: bare when it is a plain word, else quoted ('' escapes). */
function sheetName(name: string): string {
  return /^[\p{L}_][\p{L}\p{N}_.]*$/u.test(name) ? name : `'${name.replace(/'/g, "''")}'`;
}

/** Formula text of an AST node, re-parsable to the same tree. */
export function unparse(n: Node): string {
  switch (n.t) {
    case "num": return String(n.v);
    case "str": return `"${n.v.replace(/"/g, '""')}"`;
    case "bool": return n.v ? "TRUE" : "FALSE";
    case "ref": return n.key;
    case "xref": return `${sheetName(n.sheet)}!${n.key}`;
    case "range": return `${n.a}:${n.b}`;
    case "xrange": return `${sheetName(n.sheet)}!${n.a}:${n.b}`;
    case "err": return n.name ?? n.code;
    case "neg": return "-" + wrap(n.e, 5);
    case "pct": return wrap(n.e, 7) + "%";
    case "bin": {
      const p = prec(n);
      return wrap(n.l, p) + n.op + wrap(n.r, p + 1);
    }
    case "call": return `${n.name}(${n.args.map(unparse).join(",")})`;
  }
}

/** Child text, parenthesised when its precedence is below `min`. */
function wrap(n: Node, min: number): string {
  const s = unparse(n);
  return prec(n) < min ? `(${s})` : s;
}

/** Comparison key of a text: spaces removed, upper case (selection vs. unparsed node). */
export function normText(s: string): string {
  return s.replace(/\s+/g, "").toUpperCase();
}
