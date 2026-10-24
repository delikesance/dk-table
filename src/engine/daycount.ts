/**
 * Day-count conventions on 1900-system serials (see fn-date.ts), shared by YEARFRAC/DAYS360
 * (fn-acct.ts) and AMORLINC/AMORDEGRC (fn-amort.ts). Bases follow Excel:
 * 0 = US (NASD) 30/360, 1 = actual/actual, 2 = actual/360, 3 = actual/365, 4 = European 30/360.
 */
import { fromSerial, toSerial } from "./fn-date";

/** True for Gregorian leap years. */
function isLeap(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/** True when the date is the last day of February. */
function lastOfFeb(m: number, d: number, y: number): boolean {
  return m === 2 && d === (isLeap(y) ? 29 : 28);
}

/** 360-day count from y/m/d parts. */
function count360(y1: number, m1: number, d1: number, y2: number, m2: number, d2: number): number {
  return (y2 - y1) * 360 + (m2 - m1) * 30 + (d2 - d1);
}

/**
 * DAYS360 between two serials: US/NASD method (start on last day of month -> 30th; end on the 31st
 * -> 1st of next month when start < 30, else 30th), or European (`european`: any 31st -> 30th).
 */
export function days360(a: number, b: number, european: boolean): number {
  const [y1, m1, dd1] = fromSerial(a);
  let [y2, m2, d2] = fromSerial(b);
  let d1 = dd1;
  if (european) {
    if (d1 === 31) d1 = 30;
    if (d2 === 31) d2 = 30;
    return count360(y1, m1, d1, y2, m2, d2);
  }
  if (d1 === 31 || lastOfFeb(m1, d1, y1)) d1 = 30;
  if (d2 === 31) {
    if (d1 < 30) {
      d2 = 1;
      m2++;
      if (m2 > 12) [m2, y2] = [1, y2 + 1];
    } else d2 = 30;
  }
  return count360(y1, m1, d1, y2, m2, d2);
}

/** 30/360 US count as used by YEARFRAC basis 0 (both end-of-February rules, Excel variant). */
function us360(a: number, b: number): number {
  const [y1, m1, dd1] = fromSerial(a);
  const [y2, m2, dd2] = fromSerial(b);
  let [d1, d2] = [dd1, dd2];
  const feb1 = lastOfFeb(m1, d1, y1);
  if (feb1 && lastOfFeb(m2, d2, y2)) d2 = 30;
  if (feb1) d1 = 30;
  if (d2 === 31 && d1 >= 30) d2 = 30;
  if (d1 === 31) d1 = 30;
  return count360(y1, m1, d1, y2, m2, d2);
}

/** Actual/actual year fraction (Excel basis 1) for serials a <= b. */
function actual(a: number, b: number): number {
  const [y1, m1, d1] = fromSerial(a);
  const [y2, m2, d2] = fromSerial(b);
  const days = b - a;
  const withinYear = y1 === y2 || (y2 === y1 + 1 && (m1 > m2 || (m1 === m2 && d1 >= d2)));
  if (!withinYear) return days / ((toSerial(y2 + 1, 1, 1) - toSerial(y1, 1, 1)) / (y2 - y1 + 1));
  if (y1 === y2) return days / (isLeap(y1) ? 366 : 365);
  const feb29 = (isLeap(y1) && (m1 < 2 || (m1 === 2 && d1 <= 29))) || (isLeap(y2) && (m2 > 2 || (m2 === 2 && d2 === 29)));
  return days / (feb29 ? 366 : 365);
}

/** Year fraction between two serials for basis 0-4 (order-insensitive, days truncated); NaN for a bad basis. */
export function yearFrac(start: number, end: number, basis: number): number {
  let a = Math.floor(start);
  let b = Math.floor(end);
  if (a > b) [a, b] = [b, a];
  switch (Math.trunc(basis)) {
    case 0: return us360(a, b) / 360;
    case 1: return actual(a, b);
    case 2: return (b - a) / 360;
    case 3: return (b - a) / 365;
    case 4: return days360(a, b, true) / 360;
    default: return NaN;
  }
}
