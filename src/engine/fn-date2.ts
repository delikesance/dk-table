/**
 * More date/time builtins on 1900-system serials (see fn-date.ts): WEEKDAY, EDATE, EOMONTH,
 * DAYS, NETWORKDAYS, TIME, HOUR, MINUTE, SECOND. Negative dates/times -> #NUM!.
 * Registered by wire.ts with `registerBuiltin` (real error values, unlike NumFn).
 */
import type { Builtin } from "./functions";
import { err, isErr, type Value } from "./types";
import { cells, withNums } from "./fn-args";
import { fromSerial, toSerial } from "./fn-date";

/** Excel weekday with Sunday = 1 .. Saturday = 7 (serial 1 = Sunday 1900-01-01). */
function sunday1(serial: number): number {
  const r = Math.floor(serial) % 7;
  return r === 0 ? 7 : r;
}

/** WEEKDAY(date[; type=1]): types 1 (Sun=1), 2 (Mon=1), 3 (Mon=0), 11-17 (Mon..Sun = 1). */
const weekday = withNums(2, ([s, t]) => {
  if (s < 0) return err("#NUM!");
  const mon0 = (sunday1(s) + 5) % 7; // Monday = 0 .. Sunday = 6
  if (t === 1) return sunday1(s);
  if (t === 2) return mon0 + 1;
  if (t === 3) return mon0;
  if (t >= 11 && t <= 17) return ((mon0 - (t - 11) + 7) % 7) + 1;
  return err("#NUM!");
}, [undefined, 1]);

/** Serial of the date `months` after `s`, day clamped to month end (EDATE) or forced to it (EOMONTH). */
function shift(endOfMonth: boolean): Builtin {
  return withNums(2, ([s, months]) => {
    if (s < 0) return err("#NUM!");
    const [y, m, d] = fromSerial(s);
    const tm = m + Math.trunc(months);
    const last = fromSerial(toSerial(y, tm + 1, 0))[2];
    return toSerial(y, tm, endOfMonth ? last : Math.min(d, last));
  });
}

/** NETWORKDAYS(start; end[; holidays]): Mon-Fri days in [start, end] minus holidays, negative if reversed. */
const networkdays: Builtin = (args) => {
  if (args.length > 3) return err("#VALUE!");
  const holidays = new Set<number>();
  for (const v of cells(args[2])) {
    if (isErr(v)) return v;
    if (typeof v === "number") holidays.add(Math.floor(v));
  }
  return withNums(2, ([a, b]) => {
    if (a < 0 || b < 0) return err("#NUM!");
    const [lo, hi] = [Math.floor(Math.min(a, b)), Math.floor(Math.max(a, b))];
    let n = 0;
    for (let s = lo; s <= hi; s++) if (sunday1(s) % 7 > 1 && !holidays.has(s)) n++;
    return a <= b ? n : -n;
  })(args.slice(0, 2));
};

/** Seconds into the day of a serial (rounded), or #NUM! when negative. */
function secondsOf(s: number): number | Value {
  if (s < 0) return err("#NUM!");
  const t = Math.round((s - Math.floor(s)) * 86400);
  return t === 86400 ? 0 : t;
}

/** Build HOUR/MINUTE/SECOND from a seconds-of-day projection. */
function clock(f: (sec: number) => number): Builtin {
  return withNums(1, ([s]) => {
    const t = secondsOf(s);
    return typeof t === "number" ? f(t) : t;
  });
}

/** Date/time builtins keyed by upper-case name. */
export const date2Functions: Record<string, Builtin> = {
  WEEKDAY: weekday,
  EDATE: shift(false),
  EOMONTH: shift(true),
  DAYS: withNums(2, ([end, start]) => Math.floor(end) - Math.floor(start)),
  NETWORKDAYS: networkdays,
  TIME: withNums(3, ([h, m, s]) => {
    const t = Math.trunc(h) * 3600 + Math.trunc(m) * 60 + Math.trunc(s);
    return t < 0 ? err("#NUM!") : (t % 86400) / 86400;
  }),
  HOUR: clock((t) => Math.floor(t / 3600)),
  MINUTE: clock((t) => Math.floor(t / 60) % 60),
  SECOND: clock((t) => t % 60),
};
