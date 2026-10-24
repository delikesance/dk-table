/**
 * FEC field converters (pure): cell values -> AAAAMMJJ dates, "1234,50" amounts and clean text.
 * Each returns null when the value cannot be converted (the caller reports the error).
 */
import { fromSerial } from "../engine/fn-date";
import type { Value } from "../engine/sheet";

const MAX_SERIAL = 2958465; // 31/12/9999
const p = (n: number, w = 2) => String(n).padStart(w, "0");

/** y/m/d -> "AAAAMMJJ" when it is a real calendar date (years 1900..9999), else null. */
function ymd(y: number, m: number, d: number): string | null {
  const t = new Date(Date.UTC(y, m - 1, d));
  const real = t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
  return real && y >= 1900 && y <= 9999 ? `${p(y, 4)}${p(m)}${p(d)}` : null;
}

/** Text date "AAAA-MM-JJ", "JJ/MM/AAAA" or "AAAAMMJJ" -> "AAAAMMJJ", null otherwise. */
function textDate(s: string): string | null {
  const t = s.trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t) ?? /^(\d{4})(\d{2})(\d{2})$/.exec(t);
  if (m) return ymd(Number(m[1]), Number(m[2]), Number(m[3]));
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  return m ? ymd(Number(m[3]), Number(m[2]), Number(m[1])) : null;
}

/**
 * Date value -> "AAAAMMJJ": a 1900-system serial (1..2958465, time ignored), an 8-digit
 * AAAAMMJJ number, or text (see `textDate`). Null when invalid.
 */
export function fecDate(v: Value): string | null {
  if (typeof v === "number") {
    if (v >= 1 && v <= MAX_SERIAL) return ymd(...fromSerial(v)); // 60 (fake 29/02/1900) is rejected
    return Number.isInteger(v) ? textDate(String(v)) : null;
  }
  return typeof v === "string" ? textDate(v) : null;
}

/** Amount value -> integer cents; "" -> 0; text accepts "1 234,50" or "1234.50". Null when not a number. */
export function fecCents(v: Value): number | null {
  if (v === "") return 0;
  let n: number;
  if (typeof v === "number") n = v;
  else if (typeof v === "string" && v.trim() !== "") n = Number(v.replace(/[\s  ]/g, "").replace(",", "."));
  else return null;
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

/** Integer cents -> "1234,50" (comma, 2 decimals, no thousands separator, "-" for negatives). */
export function fecAmount(cents: number): string {
  const a = Math.abs(cents);
  return `${cents < 0 ? "-" : ""}${Math.floor(a / 100)},${p(a % 100)}`;
}

/** Text field: TAB/CR/LF runs become one space, surrounding blanks trimmed. */
export function fecText(s: string): string {
  return s.replace(/[\t\r\n]+/g, " ").trim();
}
