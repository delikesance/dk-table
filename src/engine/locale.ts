/**
 * Locale-portable formulas: the stored syntax is canonical (`,` between arguments, `.` decimal).
 * `toLocale` / `fromLocale` translate the separators and decimal mark of formula text only;
 * string literals, quoted sheet names and error literals are copied as they are.
 */

/** Syntax of a formula text: argument separator and decimal mark. */
export interface FormulaSyntax { argSep: "," | ";"; decimal: "." | "," }

/** Stored syntax (also English-like): `SUM(A1,2.5)`. */
export const CANONICAL: FormulaSyntax = { argSep: ",", decimal: "." };

const STRING = /^"(?:[^"]|"")*"/;
const QUOTED_SHEET = /^'(?:[^']|'')*'(?=!)/;
const ERROR = /^#(?:REF!|N\/A|VALUE!|DIV\/0!|NAME\?|NUM!|CYCLE!|SPILL!)/i;
const IDENT = /^[\p{L}_][\p{L}\p{N}_.]*/u;
const cache = new Map<string, FormulaSyntax>();

/**
 * Syntax used by a language tag: languages whose decimal mark is `,` (fr, de, es...) write `;` between
 * arguments, as Excel does. Other languages keep the canonical syntax. Invalid tags fall back to canonical.
 */
export function syntaxFor(lang: string): FormulaSyntax {
  const hit = cache.get(lang);
  if (hit) return hit;
  let decimal = ".";
  try {
    decimal = new Intl.NumberFormat(lang).formatToParts(1.5).find((p) => p.type === "decimal")?.value ?? ".";
  } catch { /* invalid tag: canonical */ }
  const syn: FormulaSyntax = decimal === "," ? { argSep: ";", decimal: "," } : CANONICAL;
  cache.set(lang, syn);
  return syn;
}

/** Number literal regex for the given decimal mark (`1`, `2.5`, `1e3`). */
function numberRe(dec: string): RegExp {
  return new RegExp(`^\\d+(?:${dec === "." ? "\\." : dec}\\d*)?(?:[eE][+-]?\\d+)?`);
}

/** First token of `rest`: its text, and whether it is a number whose decimal mark must be converted. */
function nextToken(rest: string, dec: string): { text: string; num: boolean } | null {
  for (const re of [STRING, QUOTED_SHEET, ERROR, IDENT]) {
    const m = re.exec(rest);
    if (m) return { text: m[0], num: false };
  }
  const n = numberRe(dec).exec(rest);
  return n ? { text: n[0], num: true } : null;
}

/** Rewrites separators and decimal marks of a formula from one syntax to another; non-formulas pass through. */
function convert(src: string, from: FormulaSyntax, to: FormulaSyntax): string {
  if (!src.startsWith("=") || (from.argSep === to.argSep && from.decimal === to.decimal)) return src;
  let out = "";
  for (let i = 0; i < src.length;) {
    const tok = nextToken(src.slice(i), from.decimal);
    if (tok) {
      out += tok.num ? tok.text.split(from.decimal).join(to.decimal) : tok.text;
      i += tok.text.length;
      continue;
    }
    const c = src[i++];
    if (c === '"' || c === "'") { out += c + src.slice(i); break; } // unterminated literal: keep the rest as typed
    out += c === from.argSep ? to.argSep : c;
  }
  return out;
}

/** Canonical formula text shown in a locale (`=SUM(A1,2.5)` -> `=SUM(A1;2,5)` in fr). */
export function toLocale(src: string, syn: FormulaSyntax): string {
  return convert(src, CANONICAL, syn);
}

/** Canonical formula text from text typed in a locale (`=SUM(A1;2,5)` -> `=SUM(A1,2.5)` in fr). */
export function fromLocale(src: string, syn: FormulaSyntax): string {
  return convert(src, syn, CANONICAL);
}
