/** Sheet model: sparse map of cell address ("A1") to raw value. */
export interface Sheet {
  cols: number;
  rows: number;
  cells: Record<string, string>;
}

/** Create an empty default sheet (26 columns x 100 rows). */
export function createSheet(): Sheet {
  return { cols: 26, rows: 100, cells: {} };
}
