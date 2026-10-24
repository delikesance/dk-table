/**
 * Loan / annuity builtins (Excel-compatible, sign convention: money paid out < 0):
 * IPMT, PPMT, PV, FV, RATE, NPER, CUMIPMT, CUMPRINC. `type` 1 = payment at period start.
 * Registered by wire.ts with `registerBuiltin` (real error values: #NUM!, #VALUE!).
 */
import type { Builtin } from "./functions";
import { err, type Value } from "./types";
import { fin, withNums } from "./fn-args";
import { pmtOf } from "./fn-finance";
import { solveRate } from "./solve";

/** (1+r)^n - 1, precise near r = 0. */
const growth1 = (r: number, n: number) => Math.expm1(n * Math.log1p(r));

/** Future value of `pv` plus `n` payments `pmt` at rate `r` (Excel FV). */
function fvOf(r: number, n: number, pmt: number, pv: number, type: number): number {
  if (r === 0) return -(pv + pmt * n);
  const g1 = growth1(r, n);
  return -(pv * (g1 + 1) + (pmt * (1 + r * type) * g1) / r);
}

/** Interest part of payment `per` (1-based); with type 1 the first period has no interest. */
function ipmtOf(r: number, per: number, n: number, pv: number, fv: number, type: number): number {
  const pmt = pmtOf(r, n, pv, fv, type);
  if (per === 1) return type ? 0 : -pv * r;
  return (type ? fvOf(r, per - 2, pmt, pv, 1) - pmt : fvOf(r, per - 1, pmt, pv, 0)) * r;
}

/** 1 when `t` is non-zero (Excel treats any non-zero type as 1). */
const bit = (t: number) => (t ? 1 : 0);

/** IPMT(rate; per; nper; pv[; fv; type]) or PPMT (principal part = PMT - IPMT). */
function periodPart(principal: boolean): Builtin {
  return withNums(6, ([r, per, n, pv, fv, t]) => {
    if (n === 0 || per < 1 || per > n) return err("#NUM!");
    const i = ipmtOf(r, per, n, pv, fv, bit(t));
    return fin(principal ? pmtOf(r, n, pv, fv, bit(t)) - i : i);
  }, [undefined, undefined, undefined, undefined, 0, 0]);
}

/** PV(rate; nper; pmt[; fv; type]): present value of an annuity. */
const pv = withNums(5, ([r, n, pmt, fv, t]) => {
  if (r === 0) return fin(-(fv + pmt * n));
  const g1 = growth1(r, n);
  return fin(-(fv + (pmt * (1 + r * bit(t)) * g1) / r) / (g1 + 1));
}, [undefined, undefined, undefined, 0, 0]);

/** FV(rate; nper; pmt[; pv; type]): future value of an investment. */
const fv = withNums(5, ([r, n, pmt, p, t]) => fin(fvOf(r, n, pmt, p, bit(t))),
  [undefined, undefined, undefined, 0, 0]);

/** RATE(nper; pmt; pv[; fv; type; guess=0.1]): periodic rate (Newton + bisection fallback). */
const rate = withNums(6, ([n, pmt, p, f, t, guess]) => {
  if (n <= 0) return err("#NUM!");
  const ty = bit(t);
  const eq = (r: number) => {
    if (r <= -1) return NaN;
    if (Math.abs(r) < 1e-14) return p + pmt * n + f;
    const g1 = growth1(r, n);
    return p * (g1 + 1) + (pmt * (1 + r * ty) * g1) / r + f;
  };
  const r = solveRate(eq, guess);
  return r === undefined ? err("#NUM!") : fin(Math.abs(r) < 1e-14 ? 0 : r);
}, [undefined, undefined, undefined, 0, 0, 0.1]);

/** NPER(rate; pmt; pv[; fv; type]): number of periods; impossible -> #NUM!. */
const nper = withNums(5, ([r, pmt, p, f, t]) => {
  if (r === 0) return pmt === 0 ? err("#NUM!") : fin(-(p + f) / pmt);
  const a = pmt * (1 + r * bit(t));
  return fin(Math.log((a - f * r) / (a + p * r)) / Math.log1p(r));
}, [undefined, undefined, undefined, 0, 0]);

/**
 * CUMIPMT / CUMPRINC(rate; nper; pv; start; end; type): cumulated interest or principal
 * over periods start..end (truncated). Excel checks: rate, nper, pv > 0, 1 <= start <= end <= nper,
 * type 0 or 1, else #NUM!.
 */
function cumulative(principal: boolean): Builtin {
  return (args) => {
    if (args.length !== 6) return err("#VALUE!");
    return withNums(6, ([r, n, p, s, e, t]): Value => {
      const [start, end] = [Math.trunc(s), Math.trunc(e)];
      if (r <= 0 || n <= 0 || p <= 0 || start < 1 || end < start || end > n || (t !== 0 && t !== 1))
        return err("#NUM!");
      const pmt = pmtOf(r, n, p, 0, t);
      let sum = 0;
      for (let k = start; k <= end; k++) {
        const i = ipmtOf(r, k, n, p, 0, t);
        sum += principal ? pmt - i : i;
      }
      return fin(sum);
    })(args);
  };
}

/** Loan builtins, to register via `registerBuiltin(name, fn)`. */
export const loanFunctions: Record<string, Builtin> = {
  IPMT: periodPart(false), PPMT: periodPart(true), PV: pv, FV: fv, RATE: rate, NPER: nper,
  CUMIPMT: cumulative(false), CUMPRINC: cumulative(true),
};
