/**
 * UI side of portable formulas: the syntax of the running browser language, and the conversions used by
 * the formula bar and the cell editor. Stored formulas stay canonical (see `engine/locale.ts`).
 */
import { fromLocale, syntaxFor, toLocale, type FormulaSyntax } from "../../engine/locale";
import { shiftFormula } from "../../engine/refs";

/** Syntax of the UI, read from `navigator.language` on each call. */
export function formulaSyntax(): FormulaSyntax {
  return syntaxFor(navigator.language || "en-US");
}

/** Stored formula -> text shown in the formula bar and the editor (other texts are unchanged). */
export function toInput(raw: string): string {
  return toLocale(raw, formulaSyntax());
}

/** Text typed in the formula bar or the editor -> stored formula. */
export function fromInput(text: string): string {
  return fromLocale(text, formulaSyntax());
}

/** Typed formula copied to a cell `dc` columns and `dr` rows away (Ctrl+Enter): references shift. */
export function shiftTyped(text: string, dc: number, dr: number): string {
  return shiftFormula(fromInput(text), dc, dr);
}
