import type { NumFn } from "./functions";

/** Excel-style numeric error text returned on invalid/non-convergent input. */
const NUM_ERR = "#NUM!";

/**
 * PMT(taux, nper, va[, vc=0, type=0]): periodic payment of a loan/annuity.
 * taux 0 -> -(va+vc)/nper. type 1 = payment at start of period.
 */
const pmt: NumFn = ([rate, nper, pv, fv = 0, type = 0]) => {
  if (rate === undefined || nper === undefined || pv === undefined) return "#VALUE!";
  if (nper === 0) return NUM_ERR;
  if (rate === 0) return -(pv + fv) / nper;
  const g = Math.pow(1 + rate, nper);
  return -(rate * (pv * g + fv)) / ((1 + rate * (type ? 1 : 0)) * (g - 1));
};

/** Net present value of flows at `rate` (first flow discounted one period). */
function npvAt(rate: number, flows: number[]): number {
  return flows.reduce((s, v, i) => s + v / Math.pow(1 + rate, i + 1), 0);
}

/** NPV(taux, v1, v2, ... | plage): flows discounted from period 1. */
const npv: NumFn = ([rate, ...flows]) => {
  if (rate === undefined) return "#VALUE!";
  if (rate === -1) return "#DIV/0!";
  return npvAt(rate, flows);
};

/**
 * IRR(plage): rate making the NPV of flows (starting at period 0) zero.
 * Newton from 10% (max 100 iterations), falling back to bisection on
 * [-0.99, 1e3]. Needs one positive and one negative flow, else #NUM!.
 * Note: via the flattening plug-in API an optional guess cannot be told
 * apart from the flows, so it is not supported.
 */
const irr: NumFn = (flows) => {
  if (!flows.some((v) => v > 0) || !flows.some((v) => v < 0)) return NUM_ERR;
  const f = (r: number) => flows.reduce((s, v, i) => s + v / Math.pow(1 + r, i), 0);
  const d = (r: number) => flows.reduce((s, v, i) => s - (i * v) / Math.pow(1 + r, i + 1), 0);
  let r = 0.1;
  for (let i = 0; i < 100; i++) {
    const dv = d(r);
    if (!dv || !isFinite(dv)) break;
    const next = r - f(r) / dv;
    if (!isFinite(next) || next <= -1) break;
    if (Math.abs(next - r) < 1e-10) return next;
    r = next;
  }
  let lo = -0.99;
  let hi = 1e3;
  if (f(lo) * f(hi) > 0) return NUM_ERR;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (f(lo) * f(mid) <= 0) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
};

/** Finance functions, to register via `registerFunction(name, fn)`. */
export const financeFunctions: Record<string, NumFn> = { PMT: pmt, NPV: npv, IRR: irr };
