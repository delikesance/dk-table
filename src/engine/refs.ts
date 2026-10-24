/**
 * Reference adjustment for copied formulas (Excel behaviour).
 * `shiftFormula` rewrites every cell ref of a formula: relative parts move by (dCol, dRow),
 * `$`-marked parts stay; a ref pushed off the sheet (col or row < 1) becomes `#REF!`.
 * Text inside "..." literals and '...' sheet names is left untouched; an identifier followed
 * by "(" (function such as LOG10) or "!" (sheet prefix) is not a ref.
 */
import { parseKey, makeKey } from "./address";

/** One ref, optionally `$`-prefixed on column and/or row. */
const REF = /^(\$?)([A-Za-z]{1,3})(\$?)([1-9]\d*)$/;

/** Shift one ref text; null when it leaves the sheet. Keeps the original letter case. */
function shiftRef(ref: string, dCol: number, dRow: number): string | null {
  const m = REF.exec(ref)!;
  const p = parseKey(m[2] + m[4])!;
  const col = m[1] ? p.col : p.col + dCol;
  const row = m[3] ? p.row : p.row + dRow;
  if (col < 1 || row < 1) return null;
  const letters = m[1] ? m[2] : makeKey(col, 1).slice(0, -1);
  const cased = m[2] === m[2].toLowerCase() ? letters.toLowerCase() : letters;
  return m[1] + cased + m[3] + row;
}

/** Index of the first non-space character at or after `i`. */
function skipSpaces(s: string, i: number): number {
  while (i < s.length && /\s/.test(s[i])) i++;
  return i;
}

/** End index of a quoted section starting at `i` (doubled quotes escape). */
function quotedEnd(s: string, i: number): number {
  const q = s[i];
  let j = i + 1;
  while (j < s.length) {
    if (s[j] === q) {
      if (s[j + 1] === q) { j += 2; continue; }
      return j + 1;
    }
    j++;
  }
  return j;
}

/** Rewrite every cell ref in a formula (raw starting with "="); other raw values are returned unchanged. */
export function shiftFormula(raw: string, dCol: number, dRow: number): string {
  if (!raw.startsWith("=") || (dCol === 0 && dRow === 0)) return raw;
  const word = /[A-Za-z0-9_.$]+/y;
  let out = "=";
  let i = 1;
  while (i < raw.length) {
    const c = raw[i];
    if (c === '"' || c === "'") {
      const e = quotedEnd(raw, i);
      out += raw.slice(i, e);
      i = e;
      continue;
    }
    word.lastIndex = i;
    const m = /[A-Za-z0-9_.$]/.test(c) ? word.exec(raw) : null;
    if (!m) { out += c; i++; continue; }
    let end = i + m[0].length;
    const next = raw[skipSpaces(raw, end)];
    if (!REF.test(m[0]) || next === "(" || next === "!") { out += m[0]; i = end; continue; }
    const a = shiftRef(m[0], dCol, dRow);
    let text = a;
    if (raw[end] === ":") {
      word.lastIndex = end + 1;
      const n = word.exec(raw);
      if (n && REF.test(n[0])) {
        const b = shiftRef(n[0], dCol, dRow);
        text = a !== null && b !== null ? a + ":" + b : null;
        end += 1 + n[0].length;
      }
    }
    out += text ?? "#REF!";
    i = end;
  }
  return out;
}
