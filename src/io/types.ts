/** Shared types for the `.dktable` document format. */

/** One cell: only the raw user input is persisted (values are recomputed). */
export interface DocCell {
  raw: string;
}

/** Visual/format style of one cell; `format` is a number-format code (e.g. "0.00"). */
export interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  align?: "left" | "center" | "right";
  fill?: string;
  /** Text color, `#rgb` or `#rrggbb`. */
  color?: string;
  format?: string;
}

/** One sheet; `cells` keys are A1 refs ("B3"), only non-empty cells stored. */
export interface DocSheet {
  id: string;
  name: string;
  cols: number;
  rows: number;
  cells: Record<string, DocCell>;
  /** Optional per-cell styles (absent in older files). */
  styles?: Record<string, CellStyle>;
}

/** One Lua macro stored with the document (see src/macros). */
export interface DocMacro {
  id: string;
  name: string;
  code: string;
}

/** Whole document persisted as JSON. */
export interface DktDoc {
  version: 1;
  sheets: DocSheet[];
  /** Id of the active sheet, if any. */
  active?: string;
  /** Lua macros of the workbook (optional, absent in older files). */
  macros?: DocMacro[];
}

/** Current `.dktable` format version. */
export const FORMAT_VERSION = 1;
