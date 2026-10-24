/**
 * TSV (tab-separated) encode/decode for grid copy/paste.
 * A copy made inside the app is remembered (text + top-left origin): pasting that same text
 * shifts its formulas by the origin -> target offset (`shiftFormula`, Excel behaviour).
 * Cut/paste and external TSV text are pasted verbatim.
 */

import { rangeKeys, keyOf, type Pos } from "./keys";
import { shiftFormula } from "../../engine/refs";

/** Last copy made inside the app: TSV text and its top-left cell. */
export interface CopySource {
  text: string;
  origin: Pos;
}

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
  let last: CopySource | null = null;
  /** Writes the selected range as TSV on the clipboard event; remembers it unless cut. */
  const copy = (e: ClipboardEvent, cut: boolean): void => {
    const { anchor: a, active: b } = h.sel();
    const w = Math.abs(a.col - b.col) + 1;
    const k = rangeKeys(a, b).map(h.getRaw);
    const m = Array.from({ length: k.length / w }, (_, r) => k.slice(r * w, (r + 1) * w));
    const text = toTsv(m);
    last = cut ? null : { text, origin: { col: Math.min(a.col, b.col), row: Math.min(a.row, b.row) } };
    e.clipboardData?.setData("text/plain", text);
    e.preventDefault();
  };
  root.addEventListener("copy", (e) => { if (!h.busy()) copy(e, false); });
  root.addEventListener("cut", (e) => { if (!h.busy()) { copy(e, true); h.clear(); } });
  root.addEventListener("paste", (e) => {
    if (h.busy()) return;
    const text = e.clipboardData?.getData("text/plain");
    if (!text) return;
    e.preventDefault();
    const { anchor: a, active: b } = h.sel();
    const top = { col: Math.min(a.col, b.col), row: Math.min(a.row, b.row) };
    pasteMatrix(text, top, last).forEach((line, r) => line.forEach((v, c) => {
      if (top.col + c < h.cols && top.row + r < h.rows) h.put(keyOf(top.col + c, top.row + r), v);
    }));
  });
}

/** Values to paste at `top`: formulas shifted when `text` is the app's own last copy `src`. */
export function pasteMatrix(text: string, top: Pos, src: CopySource | null): string[][] {
  const m = fromTsv(text);
  if (!src || src.text !== text) return m;
  const [dc, dr] = [top.col - src.origin.col, top.row - src.origin.row];
  return m.map((line) => line.map((v) => shiftFormula(v, dc, dr)));
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
