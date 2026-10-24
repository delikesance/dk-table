/** Cell address helpers for the grid UI (0-based col/row <-> "A1" keys). */

/** 0-based column/row position. */
export interface Pos {
  col: number;
  row: number;
}

/** Column index to letters: 0 -> "A", 26 -> "AA". */
export function colName(col: number): string {
  let n = col + 1;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/** Position to key: (0,0) -> "A1". */
export function keyOf(col: number, row: number): string {
  return colName(col) + (row + 1);
}

/** Key to position: "C10" -> {col:2,row:9}. */
export function parseKey(key: string): Pos {
  const m = /^([A-Z]+)(\d+)$/.exec(key);
  if (!m) throw new Error(`Invalid cell key: ${key}`);
  let col = 0;
  for (const ch of m[1]) col = col * 26 + (ch.charCodeAt(0) - 64);
  return { col: col - 1, row: Number(m[2]) - 1 };
}

/** All keys of the rectangle spanned by two corners, row-major. */
export function rangeKeys(a: Pos, b: Pos): string[] {
  const out: string[] = [];
  for (let r = Math.min(a.row, b.row); r <= Math.max(a.row, b.row); r++)
    for (let c = Math.min(a.col, b.col); c <= Math.max(a.col, b.col); c++) out.push(keyOf(c, r));
  return out;
}
