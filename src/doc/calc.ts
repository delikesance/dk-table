/**
 * Calculation of document chips (`=…`) with the sheet engine, read-only: each chip owns a cell of a scratch
 * sheet that sees the workbook through qualified references. Nothing in the workbook reads the scratch
 * sheet, so a document can never create a cycle with the sheets.
 */
import { createSheet, getDisplay, getRangeValues, getValue, setCell, type Sheet } from "../engine/sheet";
import { attachTo } from "../engine/book";
import { isErr } from "../engine/types";
import { liveFunctions } from "../engine/live";
import { formatValue } from "../ui/numfmt";
import { liveCall, singleRef, toEngine } from "./calcSrc";
import type { RefBook } from "./refs";

/** What a chip shows. */
export interface CalcResult {
  /** Formatted value, or the error code. */
  text: string;
  error?: boolean;
  /** Mini-chart / trend markup when the formula is a whole SPARKLINE, BAR or TREND call. */
  html?: string;
}

/** A calculator bound to a workbook. */
export interface Calc {
  /** Reserve a scratch cell for one chip. */
  slot(): string;
  /** Evaluate stored formula `stored` in `slot`, shown with chip format `fmt` ("auto" or a number format). */
  eval(slot: string, stored: string, fmt: string): CalcResult;
}

/** Format shown for `stored` with chip format `fmt`: "auto" keeps the format of a single cited cell. */
function formatOf(book: RefBook, stored: string, fmt: string): string | undefined {
  if (fmt !== "auto") return fmt;
  const r = singleRef(stored);
  return r ? book.sheets().find((s) => s.id === r.sheet)?.styles[r.ref]?.format : undefined;
}

/** Chart result for a whole live call, null when `stored` is not one. */
function chart(book: RefBook, stored: string): CalcResult | null {
  const c = liveCall(stored);
  if (!c) return null;
  const s = book.sheets().find((x) => x.id === c.sheet);
  if (!s) return { text: "#REF!", error: true };
  const r = liveFunctions[c.fn](getRangeValues(s.sheet as Sheet, c.range));
  return { text: "", html: r.html };
}

/** Create a calculator over `book` (sheets are read live on each evaluation). */
export function createCalc(book: RefBook): Calc {
  const scratch = createSheet();
  scratch.rows = 100000;
  attachTo(scratch, { list: () => book.sheets().map((s) => ({ name: s.name, sheet: s.sheet as Sheet })) });
  let n = 0;
  return {
    slot: () => `A${++n}`,
    eval(slot, stored, fmt) {
      if (stored.trim() === "") return { text: "" };
      const live = chart(book, stored);
      if (live) return live;
      setCell(scratch, slot, `=${toEngine(stored, book.sheets())}`);
      const v = getValue(scratch, slot);
      const text = getDisplay(scratch, slot);
      return isErr(v) ? { text, error: true } : { text: formatValue(text, formatOf(book, stored, fmt)) };
    },
  };
}
