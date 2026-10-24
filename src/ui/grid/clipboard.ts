/** TSV (tab-separated) encode/decode for grid copy/paste. */

import { rangeKeys, keyOf, type Pos } from "./keys";

/** Hooks needed to wire copy/paste onto a grid root. */
export interface ClipboardHooks {
  /** Current selection corners. */
  sel(): { anchor: Pos; active: Pos };
  cols: number;
  rows: number;
  /** True while inline editing (native clipboard then applies). */
  busy(): boolean;
  getRaw(key: string): string;
  /** Apply a pasted value to a cell. */
  put(key: string, raw: string): void;
  /** Clear the selected range (cut); same synchronous event = one undo step. */
  clear(): void;
}

/** Wire copy/cut/paste (TSV) listeners on `root`. */
export function bindClipboard(root: HTMLElement, h: ClipboardHooks): void {
  /** Writes the selected range as TSV on the clipboard event. */
  const copy = (e: ClipboardEvent): void => {
    const { anchor: a, active: b } = h.sel();
    const w = Math.abs(a.col - b.col) + 1;
    const k = rangeKeys(a, b).map(h.getRaw);
    const m = Array.from({ length: k.length / w }, (_, r) => k.slice(r * w, (r + 1) * w));
    e.clipboardData?.setData("text/plain", toTsv(m));
    e.preventDefault();
  };
  root.addEventListener("copy", (e) => { if (!h.busy()) copy(e); });
  root.addEventListener("cut", (e) => { if (!h.busy()) { copy(e); h.clear(); } });
  root.addEventListener("paste", (e) => {
    if (h.busy()) return;
    const text = e.clipboardData?.getData("text/plain");
    if (!text) return;
    e.preventDefault();
    const { anchor: a, active: b } = h.sel();
    const top = { col: Math.min(a.col, b.col), row: Math.min(a.row, b.row) };
    fromTsv(text).forEach((line, r) => line.forEach((v, c) => {
      if (top.col + c < h.cols && top.row + r < h.rows) h.put(keyOf(top.col + c, top.row + r), v);
    }));
  });
}

/** Encode a matrix of raw values as TSV (rows joined by "\n"). */
export function toTsv(rows: string[][]): string {
  return rows.map((r) => r.join("\t")).join("\n");
}

/** Decode TSV text into a matrix; tolerates CRLF and one trailing newline. */
export function fromTsv(text: string): string[][] {
  const t = text.replace(/\r\n?/g, "\n").replace(/\n$/, "");
  return t.split("\n").map((line) => line.split("\t"));
}
