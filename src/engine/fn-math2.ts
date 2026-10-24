/**
 * More math builtins: ROUNDUP, ROUNDDOWN, INT, TRUNC, CEILING, FLOOR, SIGN, POWER, SQRT,
 * EXP, LN, LOG, LOG10, PI, RAND, RANDBETWEEN, SUMPRODUCT (Excel semantics, #NUM! on
 * out-of-domain input). Registered by wire.ts with `registerBuiltin`.
 */
import type { Builtin } from "./functions";
import { err, isErr, type Value } from "./types";
import { cells, fin, withNums } from "./fn-args";

let random: () => number = Math.random;

/** Inject the random source used by RAND/RANDBETWEEN (tests freeze it). */
export function setRandom(fn: () => number): void {
  random = fn;
}

/** Strip binary noise (0.1*3*10 -> 3) before ceil/floor. */
const clean = (x: number) => Number(x.toPrecision(15));

/** Round |x| at `d` decimals with `step` (Math.ceil = away from zero, Math.floor = toward zero). */
function roundDir(x: number, d: number, step: (v: number) => number): number {
  const k = Math.trunc(d);
  const p = 10 ** Math.abs(k);
  const v = k >= 0 ? Math.abs(x) * p : Math.abs(x) / p;
  const r = step(clean(v));
  return clean(Math.sign(x) * (k >= 0 ? r / p : r * p));
}

/** CEILING/FLOOR(x; significance): multiple of sig; x>0 with sig<0 -> #NUM!. */
function multiple(up: boolean): Builtin {
  return withNums(2, ([x, sig]) => {
    if (sig === 0) return up ? 0 : err("#DIV/0!");
    if (x > 0 && sig < 0) return err("#NUM!");
    const q = clean(x / sig);
    return clean((up ? Math.ceil(q) : Math.floor(q)) * sig);
  }, [undefined, 1]);
}

/** LOG(x[; base=10]): logarithm; x<=0 or base<=0 -> #NUM!, base 1 -> #DIV/0!. */
const log = withNums(2, ([x, b]) => {
  if (x <= 0 || b <= 0) return err("#NUM!");
  if (b === 1) return err("#DIV/0!");
  return clean(Math.log(x) / Math.log(b));
}, [undefined, 10]);

/** SUMPRODUCT(a; b; ...): sum of element-wise products; text counts as 0, sizes must match. */
const sumproduct: Builtin = (args) => {
  if (!args.length) return err("#VALUE!");
  const lists = args.map(cells);
  const n = lists[0].length;
  let total = 0;
  for (const l of lists) if (l.length !== n) return err("#VALUE!");
  for (let i = 0; i < n; i++) {
    let p = 1;
    for (const l of lists) {
      const v = l[i];
      if (isErr(v)) return v;
      p *= typeof v === "number" ? v : 0;
    }
    total += p;
  }
  return total;
};

/** Builtins keyed by upper-case name. */
export const math2Functions: Record<string, Builtin> = {
  ROUNDUP: withNums(2, ([x, d]) => roundDir(x, d, Math.ceil), [undefined, 0]),
  ROUNDDOWN: withNums(2, ([x, d]) => roundDir(x, d, Math.floor), [undefined, 0]),
  TRUNC: withNums(2, ([x, d]) => roundDir(x, d, Math.floor), [undefined, 0]),
  INT: withNums(1, ([x]) => Math.floor(x)),
  CEILING: multiple(true),
  FLOOR: multiple(false),
  SIGN: withNums(1, ([x]) => Math.sign(x)),
  POWER: withNums(2, ([b, e]) => (b === 0 && e < 0 ? err("#DIV/0!") : fin(b ** e))),
  SQRT: withNums(1, ([x]) => (x < 0 ? err("#NUM!") : Math.sqrt(x))),
  EXP: withNums(1, ([x]) => fin(Math.exp(x))),
  LN: withNums(1, ([x]) => (x <= 0 ? err("#NUM!") : Math.log(x))),
  LOG: log,
  LOG10: withNums(1, ([x]) => (x <= 0 ? err("#NUM!") : clean(Math.log10(x)))),
  PI: withNums(0, () => Math.PI),
  RAND: withNums(0, () => random()),
  RANDBETWEEN: withNums(2, ([a, b]) => {
    const lo = Math.ceil(a);
    const hi = Math.floor(b);
    return lo > hi ? err("#NUM!") : lo + Math.floor(random() * (hi - lo + 1));
  }),
  SUMPRODUCT: sumproduct,
};
