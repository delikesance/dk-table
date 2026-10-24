/** Shared engine types: sheet model, values, errors and formula AST. */

/** One stored cell: raw user input (text, number string or "=formula"). */
export interface Cell {
  raw: string;
}

/** Sheet model: sparse map of cell address ("A1") to cell. */
export interface Sheet {
  cols: number;
  rows: number;
  cells: Record<string, Cell>;
}

/** Spreadsheet error codes. */
export type ErrorCode = "#REF!" | "#DIV/0!" | "#NAME?" | "#CYCLE!" | "#VALUE!" | "#N/A" | "#NUM!";

/** Error value carried through evaluation. */
export interface CellError {
  error: ErrorCode;
}

/** Computed value of a cell. Empty cells are "". */
export type Value = number | string | boolean | CellError;

/** Build an error value. */
export function err(code: ErrorCode): CellError {
  return { error: code };
}

/** Type guard for error values. */
export function isErr(v: unknown): v is CellError {
  return typeof v === "object" && v !== null && "error" in v;
}

/** Formula AST node. */
export type Node =
  | { t: "num"; v: number }
  | { t: "str"; v: string }
  | { t: "bool"; v: boolean }
  | { t: "ref"; key: string }
  | { t: "range"; a: string; b: string }
  | { t: "neg"; e: Node }
  | { t: "pct"; e: Node }
  | { t: "bin"; op: string; l: Node; r: Node }
  | { t: "call"; name: string; args: Node[] }
  | { t: "err"; code: ErrorCode };
