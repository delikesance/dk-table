/** Column widths of a sheet in `.dktable`: `{ "A": 140 }` (letters, px) on disk, `{ 0: 140 }` (0-based index) in the app. */
import { DktParseError, isObj } from "./parseError";

const LETTERS = /^[A-Z]+$/;

/** Column letters to 0-based index ("A" -> 0, "AA" -> 26). */
const indexOf = (name: string): number => [...name].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;

/** 0-based index to column letters (0 -> "A", 26 -> "AA"). */
const nameOf = (col: number): string => {
  let n = col + 1, s = "";
  for (; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};

/** Validates the optional `colWidths` of a sheet: letters -> positive finite px, throws a located DktParseError. */
export function checkColWidths(v: unknown, at: string): Record<string, number> {
  if (!isObj(v)) throw new DktParseError(`${at} must be an object`);
  const out: Record<string, number> = {};
  for (const [name, w] of Object.entries(v)) {
    if (!LETTERS.test(name)) throw new DktParseError(`${at}: invalid column "${name}"`);
    if (typeof w !== "number" || !Number.isFinite(w) || w <= 0) throw new DktParseError(`${at}.${name} must be a positive number`);
    out[name] = w;
  }
  return out;
}

/** App map (column index -> px) to its file form; undefined when empty so files stay lean. */
export function widthsToDoc(widths: Record<number, number>): Record<string, number> | undefined {
  const entries = Object.entries(widths).map(([c, w]) => [nameOf(Number(c)), w] as const);
  return entries.length ? Object.fromEntries(entries) : undefined;
}

/** File form (letters -> px) to the app map (column index -> px). */
export function widthsFromDoc(colWidths: Record<string, number> | undefined): Record<number, number> {
  return Object.fromEntries(Object.entries(colWidths ?? {}).map(([name, w]) => [indexOf(name), w]));
}
