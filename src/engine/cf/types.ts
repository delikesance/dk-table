/**
 * Conditional formatting (« formatage conditionnel ») rule model, persisted in `.dktable`
 * (`DocSheet.cf`). Rules are listed by priority: the first rule wins on each style property.
 * Inspired by IronCalc's `CfRule` (cell value, text, blanks, errors, duplicates, top/bottom,
 * average, formula, color scale, data bar).
 */

/** Comparison of a « Valeur de la cellule » rule. */
export type CfOp = "gt" | "ge" | "lt" | "le" | "eq" | "ne" | "between" | "notBetween";

/** Comparison of a « Texte » rule (case-insensitive). */
export type CfTextOp = "contains" | "notContains" | "begins" | "ends";

/** Rules that only test the cell itself or its range, without parameters. */
export type CfFlagType =
  | "blank" | "notBlank" | "error" | "noError" | "duplicate" | "unique" | "aboveAvg" | "belowAvg";

/** Format applied when a rule matches (subset of the cell style). */
export interface CfFormat {
  fill?: string;
  color?: string;
  bold?: boolean;
  italic?: boolean;
}

/** Parameters specific to each rule type. */
export type CfKind =
  | { type: "cell"; op: CfOp; a: string; b?: string; format: CfFormat }
  | { type: "text"; op: CfTextOp; text: string; format: CfFormat }
  | { type: CfFlagType; format: CfFormat }
  | { type: "top" | "bottom"; n: number; percent?: boolean; format: CfFormat }
  | { type: "formula"; formula: string; format: CfFormat }
  | { type: "scale"; min: string; mid?: string; max: string }
  | { type: "bar"; color: string };

/**
 * One rule. `range` is an A1 range list ("B2:B20" or "A1:A5,C1:C5"); operands `a`/`b` are
 * literals (number or text) or `=formulas` evaluated once; a `formula` rule is written for the
 * top-left cell of the range and shifted (relative refs) for the others.
 */
export type CfRule = { id: string; range: string } & CfKind;

/** Data bar drawn behind a cell: filled share (0-100) and color. */
export interface CfBar {
  pct: number;
  color: string;
}

/** Effective conditional style of one cell (merged over all matching rules). */
export interface CfStyle extends CfFormat {
  bar?: CfBar;
}

/** Every rule type, in the order of the editor's list. */
export const CF_TYPES = [
  "cell", "text", "blank", "notBlank", "error", "noError", "duplicate", "unique",
  "top", "bottom", "aboveAvg", "belowAvg", "formula", "scale", "bar",
] as const satisfies readonly CfKind["type"][];

/** Short unique rule id. */
let seq = 0;
export const cfId = (): string => `cf${Date.now().toString(36)}${(seq++).toString(36)}`;
