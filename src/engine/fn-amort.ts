/**
 * Depreciation builtins (Excel/LibreOffice algorithms): SLN, SYD, DB, DDB, VDB and the French
 * accounting AMORLINC / AMORDEGRC (first period prorated with YEARFRAC bases 0, 1, 3, 4; see daycount.ts).
 * Invalid inputs -> #NUM! (SLN with life 0 -> #DIV/0!). Registered by wire.ts with `registerBuiltin`.
 */
import type { Builtin } from "./functions";
import { err, type Value } from "./types";
import { fin, withNums } from "./fn-args";
import { yearFrac } from "./daycount";

const NUM = () => err("#NUM!");

/** SYD(cost; salvage; life; per): sum-of-years' digits depreciation for period `per`. */
const syd = withNums(4, ([c, s, l, p]) => {
  if (l <= 0 || p <= 0 || p > l) return NUM();
  return fin(((c - s) * (l - p + 1) * 2) / (l * (l + 1)));
});

/** DB(cost; salvage; life; period[; month=12]): fixed-declining balance, rate rounded to 3 decimals. */
const db = withNums(5, ([c, s, l, p, month]) => {
  if (c < 0 || s < 0 || l <= 0 || p <= 0 || month < 1 || month > 12) return NUM();
  const per = Math.trunc(p);
  if (per > l + (month < 12 ? 1 : 0)) return NUM();
  if (c === 0) return 0;
  const rate = Math.round((1 - (s / c) ** (1 / l)) * 1000) / 1000;
  let total = (c * rate * month) / 12;
  if (per === 1) return total;
  for (let i = 2; i <= Math.min(per, l); i++) {
    const dep = (c - total) * rate;
    if (i === per) return dep;
    total += dep;
  }
  return ((c - total) * rate * (12 - month)) / 12;
}, [undefined, undefined, undefined, undefined, 12]);

/** Double-declining depreciation of period `p` (fractional allowed), never below salvage (LibreOffice ScGetDDB). */
function ddbTerm(c: number, s: number, l: number, p: number, f: number): number {
  let rate = f / l;
  let old: number;
  if (rate >= 1) {
    rate = 1;
    old = p === 1 ? c : 0;
  } else old = c * (1 - rate) ** (p - 1);
  const now = c * (1 - rate) ** p;
  return Math.max(0, now < s ? old - s : old - now);
}

/** DDB(cost; salvage; life; period[; factor=2]). */
const ddb = withNums(5, ([c, s, l, p, f]) => {
  if (c < 0 || s < 0 || l <= 0 || p <= 0 || p > l || f <= 0) return NUM();
  return fin(ddbTerm(c, s, l, p, f));
}, [undefined, undefined, undefined, undefined, 2]);

/** Declining depreciation over the first `per` periods of a life `life1`, switching to straight line when larger. */
function interVdb(c: number, s: number, l: number, life1: number, per: number, f: number): number {
  const end = Math.ceil(per);
  let left = c - s;
  let sln = 0;
  let straight = false;
  let total = 0;
  for (let i = 1; i <= end; i++) {
    let term: number;
    if (straight) term = sln;
    else {
      const d = ddbTerm(c, s, l, i, f);
      sln = left / (life1 - (i - 1));
      if (sln > d) [term, straight] = [sln, true];
      else [term, left] = [d, left - d];
    }
    if (i === end) term *= per + 1 - end;
    total += term;
  }
  return total;
}

/** VDB(cost; salvage; life; start; end[; factor=2; no_switch=FALSE]): depreciation between two (fractional) periods. */
const vdb = withNums(7, ([c, s, l, start, end, f, noSwitch]) => {
  if (start < 0 || end < start || end > l || l <= 0 || c < 0 || s > c || f <= 0) return NUM();
  const i0 = Math.floor(start);
  const i1 = Math.ceil(end);
  if (noSwitch !== 0) {
    let v = 0;
    for (let i = i0 + 1; i <= i1; i++) {
      let t = ddbTerm(c, s, l, i, f);
      if (i === i0 + 1) t *= Math.min(end, i0 + 1) - start;
      else if (i === i1) t *= end + 1 - i1;
      v += t;
    }
    return fin(v);
  }
  let part = 0;
  if (start !== i0) {
    const rest = c - interVdb(c, s, l, l, i0, f);
    part += (start - i0) * interVdb(rest, s, l, l - i0, 1, f);
  }
  if (end !== i1) {
    const rest = c - interVdb(c, s, l, l, i1 - 1, f);
    part += (i1 - end) * interVdb(rest, s, l, l - (i1 - 1), 1, f);
  }
  const rest = c - interVdb(c, s, l, l, i0, f);
  return fin(interVdb(rest, s, l, l - i0, i1 - i0, f) - part);
}, [undefined, undefined, undefined, undefined, undefined, 2, 0]);

/** Excel rounding to an integer (halves away from zero). */
const round0 = (x: number) => Math.sign(x) * Math.round(Math.abs(x));

/** Shared argument checks of AMORLINC/AMORDEGRC; returns the first-period year fraction or an error. */
function amorFrac(c: number, bought: number, first: number, s: number, p: number, r: number, basis: number): number | Value {
  const b = Math.trunc(basis);
  if (c < 0 || s < 0 || s > c || p < 0 || r <= 0 || bought > first || bought < 0 || ![0, 1, 3, 4].includes(b)) return NUM();
  return yearFrac(bought, first, b);
}

/** AMORLINC(cost; purchased; first_period; salvage; period; rate[; basis=0]): French linear depreciation. */
const amorlinc = withNums(7, ([c, bought, first, s, p, r, basis]) => {
  const yf = amorFrac(c, bought, first, s, p, r, basis);
  if (typeof yf !== "number") return yf;
  const per = Math.trunc(p);
  const one = c * r;
  const first0 = yf * r * c;
  const full = Math.trunc((c - s - first0) / one);
  let v = 0;
  if (per === 0) v = first0;
  else if (per <= full) v = one;
  else if (per === full + 1) v = c - s - one * full - first0;
  return v > 0 ? v : 0;
}, [undefined, undefined, undefined, undefined, undefined, undefined, 0]);

/** Degressive coefficient by asset life 1/rate (Excel: 3-4 -> 1.5, 5-6 -> 2, > 6 -> 2.5, other -> #NUM!). */
function amorCoeff(life: number): number | undefined {
  if (life >= 3 && life <= 4) return 1.5;
  if (life >= 5 && life <= 6) return 2;
  return life > 6 ? 2.5 : undefined;
}

/** AMORDEGRC(...same as AMORLINC): French degressive depreciation, amounts rounded to integers; half the rest in the before-last period. */
const amordegrc = withNums(7, ([c, bought, first, s, p, r, basis]) => {
  const yf = amorFrac(c, bought, first, s, p, r, basis);
  if (typeof yf !== "number") return yf;
  const coeff = amorCoeff(1 / r);
  if (coeff === undefined) return NUM();
  const per = Math.trunc(p);
  const rate = r * coeff;
  let dep = round0(yf * rate * c);
  let cost = c - dep;
  let rest = cost - s;
  for (let n = 0; n < per; n++) {
    dep = round0(rate * cost);
    rest -= dep;
    if (rest < 0) return per - n <= 1 ? round0(cost * 0.5) : 0;
    cost -= dep;
  }
  return dep;
}, [undefined, undefined, undefined, undefined, undefined, undefined, 0]);

/** Depreciation builtins keyed by upper-case name. */
export const amortFunctions: Record<string, Builtin> = {
  SLN: withNums(3, ([c, s, l]) => (l === 0 ? err("#DIV/0!") : fin((c - s) / l))),
  SYD: syd,
  DB: db,
  DDB: ddb,
  VDB: vdb,
  AMORLINC: amorlinc,
  AMORDEGRC: amordegrc,
};
