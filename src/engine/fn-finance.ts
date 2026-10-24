import type { NumFn } from "./functions";

/** Excel-style numeric error text returned on invalid/non-convergent input. */
const NUM_ERR = "#NUM!";

/**
 * PMT(taux, nper, va[, vc=0, type=0]): periodic payment of a loan/annuity.
 * taux 0 -> -(va+vc)/nper. type 1 = payment at start of period.
 * Shared by fn-loan.ts (IPMT, PPMT, CUMIPMT...). nper must be non-zero.
 */
export function pmtOf(rate: number, nper: number, pv: number, fv = 0, type = 0): number {
  if (rate === 0) return -(pv + fv) / nper;
  const g = Math.pow(1 + rate, nper);
  return -(rate * (pv * g + fv)) / ((1 + rate * (type ? 1 : 0)) * (g - 1));
}

/** PMT NumFn wrapper: missing required arg -> #VALUE!, nper 0 -> #NUM!. */
const pmt: NumFn = ([rate, nper, pv, fv = 0, type = 0]) => {
  if (rate === undefined || nper === undefined || pv === undefined) return "#VALUE!";
  if (nper === 0) return NUM_ERR;
  return pmtOf(rate, nper, pv, fv, type);
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

/** Finance functions, to register via `registerFunction(name, fn)`. */
export const financeFunctions: Record<string, NumFn> = { PMT: pmt, NPV: npv };
