/** Sheet access used by conditional formatting: cell values + evaluation of ad-hoc `=formulas`. */
import { getValue, type Sheet, type Value } from "../sheet";
import { parseFormula } from "../parser";
import { evaluate } from "../evaluator";
import { err } from "../types";

/** What rule evaluation needs from the workbook (injectable for tests). */
export interface CfEnv {
  /** Computed value of a cell ("" when empty). */
  read(key: string): Value;
  /** Value of a formula (`=...`) evaluated against the sheet; parse errors give `#VALUE!`. */
  evaluate(formula: string): Value;
}

/** Environment over an engine sheet (qualified refs resolve through the bound workbook). */
export function sheetEnv(sheet: Sheet): CfEnv {
  const read = (k: string): Value => getValue(sheet, k);
  return {
    read,
    evaluate(formula) {
      try {
        return evaluate(parseFormula(formula.replace(/^=/, "")), sheet, read);
      } catch {
        return err("#VALUE!");
      }
    },
  };
}
