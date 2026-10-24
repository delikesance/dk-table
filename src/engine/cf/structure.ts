/** Conditional formatting rules under structural edits (insert/delete rows or columns). */
import { rewriteFormula, type StructEdit } from "../structure";
import type { CfRule } from "./types";

/** Range list after the edit; parts whose cells are all deleted are dropped ("" when none remain). */
export function shiftRange(range: string, e: StructEdit): string {
  return range.split(",").map((p) => rewriteFormula(`=${p.trim()}`, e).slice(1))
    .filter((p) => p && !p.includes("#REF!")).join(", ");
}

/** Rules after the edit: ranges, formulas and `=operands` rewritten; rules left without cells are removed. */
export function shiftRules(rules: readonly CfRule[], e: StructEdit): CfRule[] {
  const out: CfRule[] = [];
  for (const r of rules) {
    const range = shiftRange(r.range, e);
    if (!range) continue;
    const next = { ...r, range } as CfRule;
    if (next.type === "formula") next.formula = rewriteFormula(next.formula, e);
    if (next.type === "cell") {
      next.a = rewriteFormula(next.a, e);
      if (next.b !== undefined) next.b = rewriteFormula(next.b, e);
    }
    out.push(next);
  }
  return out;
}
