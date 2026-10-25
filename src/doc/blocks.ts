/** Data side of linked blocks (table / bar / trend of a range): read the range, pick columns, build chart series. */
import { getDisplay, getValue, type Sheet } from "../engine/sheet";
import { formatValue } from "../ui/numfmt";
import { keyOf, parseKey } from "../ui/grid/keys";
import type { RefBook } from "./refs";

/** Attributes of a `liveBlock` node. */
export interface BlockAttrs {
  sheet: string;
  /** Range, "A3:D4". */
  ref: string;
  kind: "table" | "bar" | "trend";
  /** First row of the range is a header row. */
  header: boolean;
  /** Displayed column indexes (0-based within the range); null = all. */
  cols: number[] | null;
  /** Column index plotted by bar / trend; null = the last one. */
  value: number | null;
}

/** A range read from the workbook: displayed text and numbers (NaN when not a number). */
export interface RangeData { sheetName: string; rows: string[][]; nums: number[][] }

/** Read `a.ref` from the workbook; null when the sheet or the range is gone. */
export function readRange(book: RefBook, a: BlockAttrs): RangeData | null {
  const s = book.sheets().find((x) => x.id === a.sheet);
  if (!s) return null;
  const [p, q] = a.ref.split(":");
  try {
    const t = parseKey(p), u = parseKey(q ?? p);
    const [c0, c1, r0, r1] = [Math.min(t.col, u.col), Math.max(t.col, u.col), Math.min(t.row, u.row), Math.max(t.row, u.row)];
    const rows: string[][] = [], nums: number[][] = [];
    for (let r = r0; r <= r1; r++) {
      const tr: string[] = [], nr: number[] = [];
      for (let c = c0; c <= c1; c++) {
        const k = keyOf(c, r);
        tr.push(formatValue(getDisplay(s.sheet, k), s.styles[k]?.format));
        const v = getValue(s.sheet, k);
        nr.push(typeof v === "number" ? v : NaN);
      }
      rows.push(tr); nums.push(nr);
    }
    return { sheetName: s.name, rows, nums };
  } catch { return null; }
}

/** Header and body rows of a table block, restricted to the chosen columns. */
export function tableView(d: RangeData, a: BlockAttrs): { head: string[] | null; body: string[][] } {
  const pick = (row: string[]): string[] => (a.cols ? a.cols.filter((i) => i < row.length).map((i) => row[i]) : row);
  const head = a.header && d.rows.length ? pick(d.rows[0]) : null;
  return { head, body: d.rows.slice(a.header ? 1 : 0).map(pick) };
}

/** Series of a chart block: labels = first column, values = chosen (default last) column. */
export function chartData(d: RangeData, a: BlockAttrs): { labels: string[]; values: number[]; valueLabels: string[]; valueName: string } {
  const width = d.rows[0]?.length ?? 0;
  const col = a.value !== null && a.value < width ? a.value : width - 1;
  const from = a.header ? 1 : 0;
  return {
    labels: d.rows.slice(from).map((r) => r[0]),
    values: d.nums.slice(from).map((r) => r[col]),
    valueLabels: d.rows.slice(from).map((r) => r[col]),
    valueName: a.header ? d.rows[0]?.[col] ?? "" : "",
  };
}

/** Bounding range "A1:D4" of every filled cell of `sheet` (A1 when empty). */
export function usedRange(sheet: Sheet): string {
  let c = 0, r = 0;
  for (const k of Object.keys(sheet.cells)) {
    const p = parseKey(k);
    c = Math.max(c, p.col); r = Math.max(r, p.row);
  }
  return `A1:${keyOf(c, r)}`;
}
