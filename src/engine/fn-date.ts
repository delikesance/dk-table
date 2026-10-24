/**
 * Date functions (DATE, YEAR, MONTH, DAY, TODAY, NOW).
 * Dates are Excel-like serial numbers (1900 system: 1 = 1900-01-01, fake 1900-02-29 = 60, then days since 1899-12-30), fraction = time of day.
 * Wire with: `for (const [n, f] of Object.entries(dateFunctions)) registerFunction(n, f)`.
 * Invalid argument count/values return "#VALUE!" (NumFn can only return text/number).
 */
import type { NumFn } from "./functions";

const DAY_MS = 86_400_000;
const BAD = "#VALUE!";

let clock: () => number = Date.now;

/** Inject the clock (ms since epoch) used by TODAY/NOW; tests freeze it. */
export function setClock(fn: () => number): void {
  clock = fn;
}

/**
 * Serial number for a (possibly overflowing) y/m/d, UTC arithmetic.
 * Excel 1900 convention (same as numfmt.ts): 1 = 1900-01-01, 60 = fake 1900-02-29,
 * >= 61 counts days since 1899-12-30.
 */
export function toSerial(y: number, m: number, d: number): number {
  if (Math.trunc(y) === 1900 && Math.trunc(m) === 2 && Math.trunc(d) === 29) return 60;
  const t = new Date(0);
  t.setUTCFullYear(Math.trunc(y), Math.trunc(m) - 1, Math.trunc(d));
  t.setUTCHours(0, 0, 0, 0);
  const raw = Math.round(t.getTime() / DAY_MS) + 25569; // days since 1899-12-30
  return raw <= 60 ? raw - 1 : raw;
}

/** Serial number -> [year, month, day] (time part dropped; 60 -> 1900-02-29). */
export function fromSerial(serial: number): [number, number, number] {
  const s = Math.floor(serial);
  if (s === 60) return [1900, 2, 29];
  const d = new Date((s < 60 ? s + 1 : s) * DAY_MS + Date.UTC(1899, 11, 30));
  return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()];
}

/** Convert a serial number to an ISO date string "YYYY-MM-DD" (same convention as the date format). */
export function serialToISO(serial: number): string {
  const [y, m, d] = fromSerial(serial);
  const p = (n: number, w: number) => String(n).padStart(w, "0");
  return `${p(y, 4)}-${p(m, 2)}-${p(d, 2)}`;
}

/** Build a one-argument accessor over a serial (negative serials -> #VALUE!). */
function part(f: (ymd: [number, number, number]) => number): NumFn {
  return (n) => (n.length !== 1 || n[0] < 0 ? BAD : f(fromSerial(n[0])));
}

/** Current local date-time as a serial (local fields read as if UTC). */
function nowSerial(): number {
  const d = new Date(clock());
  const day = toSerial(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const secs = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
  return day + secs / 86400;
}

/** Date function table (upper-case name -> implementation). */
export const dateFunctions: Record<string, NumFn> = {
  /** DATE(year, month, day): serial; month/day overflow rolls over. */
  DATE: (n) => (n.length === 3 ? toSerial(n[0], n[1], n[2]) : BAD),
  /** YEAR(serial): four-digit year. */
  YEAR: part((t) => t[0]),
  /** MONTH(serial): 1-12. */
  MONTH: part((t) => t[1]),
  /** DAY(serial): 1-31. */
  DAY: part((t) => t[2]),
  /** TODAY(): current date serial (no time). */
  TODAY: (n) => (n.length === 0 ? Math.floor(nowSerial()) : BAD),
  /** NOW(): current date-time serial. */
  NOW: (n) => (n.length === 0 ? nowSerial() : BAD),
};
