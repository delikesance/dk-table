/**
 * Date functions (DATE, YEAR, MONTH, DAY, TODAY, NOW).
 * Dates are Excel-like serial numbers: days since 1899-12-30, fraction = time of day.
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

/** Serial number for a (possibly overflowing) y/m/d, using UTC arithmetic. */
function toSerial(y: number, m: number, d: number): number {
  const t = new Date(0);
  t.setUTCFullYear(Math.trunc(y), Math.trunc(m) - 1, Math.trunc(d));
  t.setUTCHours(0, 0, 0, 0);
  return Math.round(t.getTime() / DAY_MS) + 25569;
}

/** Serial number -> UTC Date (time part dropped). */
function fromSerial(serial: number): Date {
  return new Date((Math.floor(serial) - 25569) * DAY_MS);
}

/** Convert a serial number to an ISO date string "YYYY-MM-DD" (reusable by date formatting). */
export function serialToISO(serial: number): string {
  const d = fromSerial(serial);
  const p = (n: number, w: number) => String(n).padStart(w, "0");
  return `${p(d.getUTCFullYear(), 4)}-${p(d.getUTCMonth() + 1, 2)}-${p(d.getUTCDate(), 2)}`;
}

/** Build a one-argument accessor over a serial (negative serials -> #VALUE!). */
function part(f: (d: Date) => number): NumFn {
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
  YEAR: part((d) => d.getUTCFullYear()),
  /** MONTH(serial): 1-12. */
  MONTH: part((d) => d.getUTCMonth() + 1),
  /** DAY(serial): 1-31. */
  DAY: part((d) => d.getUTCDate()),
  /** TODAY(): current date serial (no time). */
  TODAY: (n) => (n.length === 0 ? Math.floor(nowSerial()) : BAD),
  /** NOW(): current date-time serial. */
  NOW: (n) => (n.length === 0 ? nowSerial() : BAD),
};
