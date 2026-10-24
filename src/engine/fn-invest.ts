/**
 * Investment-return builtins (Excel-compatible): IRR, MIRR, XNPV, XIRR.
 * Dates are 1900-system serials (see fn-date.ts), truncated to whole days.
 * Registered by wire.ts with `registerBuiltin` (plain mode: a range arrives as a flat Value[]).
 */
import { collectNums, type Arg, type Builtin } from "./functions";
import { err, isErr, type Value } from "./types";
import { cells, fin, numArg } from "./fn-args";
import { solveRate } from "./solve";

/** Numbers of a range arg (text/blank ignored, first error returned). */
function flowsOf(a: Arg | undefined): number[] | Value {
  return collectNums(a === undefined ? [] : [Array.isArray(a) ? a : [a]]);
}

/** True when the flows hold at least one positive and one negative value. */
const mixed = (xs: number[]) => xs.some((v) => v > 0) && xs.some((v) => v < 0);

/**
 * IRR(values[; guess=0.1]): rate zeroing the NPV of flows from period 0.
 * Backward compatible: when the first arg is not a range, every arg is a flow (no guess).
 */
const irr: Builtin = (args) => {
  const ranged = Array.isArray(args[0]);
  if (ranged && args.length > 2) return err("#VALUE!");
  const flows = ranged ? flowsOf(args[0]) : collectNums(args);
  if (!Array.isArray(flows)) return flows;
  const guess = ranged ? numArg(args, 1, 0.1) : 0.1;
  if (typeof guess !== "number") return guess;
  if (!mixed(flows)) return err("#NUM!");
  const r = solveRate((x) => flows.reduce((s, v, i) => s + v / Math.pow(1 + x, i), 0), guess);
  return r === undefined ? err("#NUM!") : fin(r);
};

/** Sum of flows discounted from period 1 at `rate`, keeping only those matching `keep`. */
function npvKept(rate: number, flows: number[], keep: (v: number) => boolean): number {
  return flows.reduce((s, v, i) => (keep(v) ? s + v / Math.pow(1 + rate, i + 1) : s), 0);
}

/** MIRR(values; finance_rate; reinvest_rate): modified IRR; no positive or no negative flow -> #DIV/0!. */
const mirr: Builtin = (args) => {
  if (args.length !== 3) return err("#VALUE!");
  const flows = flowsOf(args[0]);
  if (!Array.isArray(flows)) return flows;
  const [fr, rr] = [numArg(args, 1), numArg(args, 2)];
  if (typeof fr !== "number") return fr;
  if (typeof rr !== "number") return rr;
  const n = flows.length;
  if (!mixed(flows)) return err("#DIV/0!");
  const gain = -npvKept(rr, flows, (v) => v > 0) * Math.pow(1 + rr, n);
  const cost = npvKept(fr, flows, (v) => v < 0) * (1 + fr);
  return fin(Math.pow(gain / cost, 1 / (n - 1)) - 1);
};

/** Dated flows: values and their offsets from the first date, in 365-day years. */
interface Schedule { v: number[]; t: number[] }

/** Paired (value, year offset) lists, or an error: mismatch or date before the first -> #NUM!. */
function schedule(vals: Arg | undefined, dates: Arg | undefined): Schedule | Value {
  const [vs, ds] = [cells(vals), cells(dates)];
  for (const x of [...vs, ...ds]) {
    if (isErr(x)) return x;
    if (typeof x !== "number") return err("#VALUE!");
  }
  if (vs.length !== ds.length || vs.length === 0) return err("#NUM!");
  const days = (ds as number[]).map(Math.trunc);
  if (days.some((d) => d < 0 || d < days[0])) return err("#NUM!");
  return { v: vs as number[], t: days.map((d) => (d - days[0]) / 365) };
}

/** Net present value of a dated schedule at `rate`. */
const xnpvAt = (rate: number, s: Schedule) =>
  s.v.reduce((acc, v, i) => acc + v / Math.pow(1 + rate, s.t[i]), 0);

/** XNPV(rate; values; dates): NPV of irregularly dated flows (365-day years). */
const xnpv: Builtin = (args) => {
  if (args.length !== 3) return err("#VALUE!");
  const rate = numArg(args, 0);
  if (typeof rate !== "number") return rate;
  const s = schedule(args[1], args[2]);
  if (isErr(s)) return s;
  if (rate <= -1) return err("#NUM!");
  return fin(xnpvAt(rate, s as Schedule));
};

/** XIRR(values; dates[; guess=0.1]): rate zeroing XNPV; needs a sign change, else #NUM!. */
const xirr: Builtin = (args) => {
  if (args.length < 2 || args.length > 3) return err("#VALUE!");
  const s = schedule(args[0], args[1]);
  if (isErr(s)) return s;
  const sch = s as Schedule;
  const guess = numArg(args, 2, 0.1);
  if (typeof guess !== "number") return guess;
  if (!mixed(sch.v)) return err("#NUM!");
  const r = solveRate((x) => (x <= -1 ? NaN : xnpvAt(x, sch)), guess);
  return r === undefined ? err("#NUM!") : fin(r);
};

/** Investment builtins, to register via `registerBuiltin(name, fn)` (plain mode). */
export const investFunctions: Record<string, Builtin> = { IRR: irr, MIRR: mirr, XNPV: xnpv, XIRR: xirr };
