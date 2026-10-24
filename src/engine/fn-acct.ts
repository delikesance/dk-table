/**
 * Accounting helpers: MROUND, YEARFRAC, DAYS360 (Excel semantics, real error values).
 * Day-count rules live in daycount.ts. Registered by wire.ts with `registerBuiltin`.
 */
import type { Builtin } from "./functions";
import { err } from "./types";
import { fin, withNums } from "./fn-args";
import { days360, yearFrac } from "./daycount";

/** MROUND(number; multiple): nearest multiple, halves away from zero; sign mismatch -> #NUM!. */
const mround = withNums(2, ([n, m]) => {
  if (m === 0 || n === 0) return 0;
  if (Math.sign(n) !== Math.sign(m)) return err("#NUM!");
  const q = Math.floor(n / m + 0.5 + 1e-12);
  return fin(Number((q * m).toPrecision(15)));
});

/** YEARFRAC(start; end[; basis=0]): fraction of a year between two dates; negative date or basis outside 0-4 -> #NUM!. */
const yearfrac = withNums(3, ([a, b, basis]) => {
  if (a < 0 || b < 0) return err("#NUM!");
  return fin(yearFrac(a, b, basis));
}, [undefined, undefined, 0]);

/** DAYS360(start; end[; european=FALSE]): days on a 360-day year (US/NASD or European method). */
const days360fn = withNums(3, ([a, b, eu]) => {
  if (a < 0 || b < 0) return err("#NUM!");
  return days360(a, b, eu !== 0);
}, [undefined, undefined, 0]);

/** Accounting builtins keyed by upper-case name. */
export const acctFunctions: Record<string, Builtin> = {
  MROUND: mround,
  YEARFRAC: yearfrac,
  DAYS360: days360fn,
};
