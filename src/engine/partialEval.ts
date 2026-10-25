/** Partial evaluation: value of one AST sub-expression in its sheet, and mapping of a selected text to its node. */
import type { Node, Sheet, Value } from "./types";
import { evaluate } from "./evaluator";
import { getState } from "./state";
import { parseFormula } from "./parser";
import { normText, unparse } from "./unparse";

/** Value of an AST node in `sheet`, same as the full evaluation (errors come back as values). */
export function evalNode(sheet: Sheet, node: Node): Value {
  const values = getState(sheet).values;
  return evaluate(node, sheet, (k) => values.get(k) ?? "");
}

/** Child nodes of an AST node, in source order. */
function children(n: Node): Node[] {
  if (n.t === "neg" || n.t === "pct") return [n.e];
  if (n.t === "bin") return [n.l, n.r];
  if (n.t === "call") return n.args;
  return [];
}

/**
 * AST node whose text matches `text` (spaces and case ignored). Pre-order, so the outermost
 * match wins when the same text occurs twice (A1+A1+A1: the left "A1+A1" is not the root).
 */
export function findNode(ast: Node, text: string): Node | undefined {
  const want = normText(text);
  const walk = (n: Node): Node | undefined => {
    if (normText(unparse(n)) === want) return n;
    for (const c of children(n)) {
      const hit = walk(c);
      if (hit) return hit;
    }
    return undefined;
  };
  return walk(ast);
}

/**
 * Partial value for a selected piece of a formula: `formula` is the text after "=", `text` the
 * selected part. Undefined when the formula does not parse or no node matches the selection.
 */
export function evalSelection(sheet: Sheet, formula: string, text: string): { node: Node; value: Value } | undefined {
  let ast: Node;
  try {
    ast = parseFormula(formula.replace(/^=/, ""));
  } catch {
    return undefined;
  }
  const node = findNode(ast, text);
  return node ? { node, value: evalNode(sheet, node) } : undefined;
}
