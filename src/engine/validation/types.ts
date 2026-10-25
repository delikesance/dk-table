/** Data-validation rule types (pure data, persisted in `.dktable` as `DocSheet.validation`). */

/** Kind of constraint: whole number, decimal number, one of a list, text length. */
export type ValType = "whole" | "decimal" | "list" | "length";

/** One rule: constrains the cells of `range` ("A1:B5" or "C3"). Empty cells are always valid. */
export interface ValRule {
  range: string;
  type: ValType;
  /** Lower bound (whole/decimal/length), inclusive. */
  min?: number;
  /** Upper bound (whole/decimal/length), inclusive. */
  max?: number;
  /** Accepted values (list). */
  items?: string[];
}

/** One cell breaking a rule. */
export interface Invalid {
  key: string;
  raw: string;
  message: string;
}
