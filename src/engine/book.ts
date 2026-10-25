/**
 * Workbook registry: which named sheets a sheet can see through qualified refs.
 * Dependency-free (imported by the evaluator); binding + cross-sheet recalc live in `workbook.ts`.
 */
import type { Sheet } from "./types";

/** A sheet with its user-visible name. */
export interface NamedSheet {
  name: string;
  sheet: Sheet;
}

/** A workbook = live list of its named sheets (read on every lookup, so renames apply). */
export interface Book {
  list: () => NamedSheet[];
}

const books = new WeakMap<Sheet, Book>();

/** Attach `book` to every sheet it currently lists. */
export function attachBook(book: Book): void {
  for (const { sheet } of book.list()) books.set(sheet, book);
}

/** Workbook a sheet belongs to (undefined when standalone). */
export function bookOf(sheet: Sheet): Book | undefined {
  return books.get(sheet);
}

/** Resolve a sheet name (case-insensitive) as seen from `from`; undefined if unknown/unbound. */
export function resolveSheet(from: Sheet, name: string): Sheet | undefined {
  const n = name.toLowerCase();
  return bookOf(from)?.list().find((e) => e.name.toLowerCase() === n)?.sheet;
}

/** Lower-cased name of `sheet` inside its workbook (undefined when unbound). */
export function sheetName(sheet: Sheet): string | undefined {
  return bookOf(sheet)?.list().find((e) => e.sheet === sheet)?.name.toLowerCase();
}

/** Give one standalone sheet (e.g. a document's scratch sheet) a view of `book` without listing it there. */
export function attachTo(sheet: Sheet, book: Book): void {
  books.set(sheet, book);
}
