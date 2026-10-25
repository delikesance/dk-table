/** Display-only number formatting (fr-FR); never alters raw or computed values. */
import { formatCustom } from "./numfmtCustom";

const fmts: Record<string, Intl.NumberFormat> = {
  number: new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  percent: new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 2 }),
  currency: new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }),
};

/** Préfixe du format personnalisé : `custom:<code>` (le code est stocké dans `CellStyle.format`). */
export const CUSTOM = "custom:";

const MAX_SERIAL = 2958465; // 31/12/9999
const pad = (n: number, w = 2) => String(n).padStart(w, "0");

/**
 * Excel-style date serial -> "DD/MM/YYYY". Convention: serial 1 = 01/01/1900,
 * serial 60 = fake 29/02/1900 (Excel's 1900 leap-year bug kept for
 * compatibility), serial >= 61 counts days since 1899-12-30. Fraction (time)
 * ignored. Returns null outside 1..2958465.
 */
function serialToDate(serial: number): string | null {
  const s = Math.floor(serial);
  if (s < 1 || s > MAX_SERIAL) return null;
  if (s === 60) return "29/02/1900";
  const d = new Date(Date.UTC(1899, 11, s < 60 ? 31 : 30) + s * 86400000);
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${pad(d.getUTCFullYear(), 4)}`;
}

/** ISO "YYYY-MM-DD" text -> "DD/MM/YYYY", null if not a valid calendar date. */
function isoToDate(text: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text.trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  const ok = dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
  return ok ? `${m[3]}/${m[2]}/${m[1]}` : null;
}

/** Figure space: pads positives/zero to the width of the ")" closing a negative. */
const FIGURE_SPACE = " ";

/**
 * Accounting ("Comptabilité"): `1 234,50 € ` / `(1 234,50 €)` / `- € `; amounts that round
 * to 0,00 show the dash. The trailing figure space keeps digits and € aligned in a column.
 */
function accounting(n: number): string {
  const cents = Math.round(Math.abs(n) * 100);
  if (cents === 0) return `- €${FIGURE_SPACE}`;
  const s = fmts.currency.format(cents / 100);
  return n < 0 ? `(${s})` : s + FIGURE_SPACE;
}

/**
 * Format a displayed cell `text` according to format code `format`
 * ("general" | "number" | "percent" | "currency" | "accounting" | "date"). Non numeric
 * text, empty text, unknown or missing formats are returned unchanged. "date"
 * accepts an Excel serial (see `serialToDate`) or ISO text.
 */
export function formatValue(text: string, format?: string): string {
  if (format?.startsWith(CUSTOM)) return formatCustom(text, format.slice(CUSTOM.length)) ?? text;
  if (format === "accounting") {
    const n = Number(text);
    return text.trim() !== "" && Number.isFinite(n) ? accounting(n) : text;
  }
  if (format === "date") {
    if (text.trim() === "") return text;
    const n = Number(text);
    return (Number.isFinite(n) ? serialToDate(n) : isoToDate(text)) ?? text;
  }
  const f = format ? fmts[format] : undefined;
  if (!f || text.trim() === "") return text;
  const n = Number(text);
  return Number.isFinite(n) ? f.format(n) : text;
}
