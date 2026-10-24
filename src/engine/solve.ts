/**
 * Rate root finder shared by RATE (fn-loan.ts), IRR and XIRR (fn-invest.ts):
 * Newton from the guess (numeric derivative), then a bracket scan + bisection
 * fallback on rates in (-1, 1000]. Returns undefined when no root is found (#NUM!).
 */

/** Rates probed by the fallback scan for a sign change, in increasing order. */
const GRID = [-0.999, -0.99, -0.9, -0.75, -0.5, -0.3, -0.2, -0.1, -0.05, 0, 0.02, 0.05, 0.1, 0.2, 0.3, 0.5,
  0.75, 1, 2, 5, 10, 100, 1000];

/** Newton iterations from `guess`; undefined when it diverges or leaves (-1, +inf). */
function newton(f: (r: number) => number, guess: number): number | undefined {
  let r = guess;
  for (let i = 0; i < 100; i++) {
    const y = f(r);
    if (!Number.isFinite(y)) return undefined;
    if (y === 0) return r;
    const h = 1e-6 * Math.max(1, Math.abs(r));
    const d = (f(r + h) - f(r - h)) / (2 * h);
    if (!d || !Number.isFinite(d)) return undefined;
    const next = r - y / d;
    if (!Number.isFinite(next) || next <= -1) return undefined;
    if (Math.abs(next - r) < 1e-12 * Math.max(1, Math.abs(r))) return next;
    r = next;
  }
  return Math.abs(f(r)) < 1e-7 ? r : undefined;
}

/** Bisection on [lo, hi] where f changes sign. */
function bisect(f: (r: number) => number, lo: number, hi: number): number {
  let flo = f(lo);
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fm = f(mid);
    if (fm === 0) return mid;
    if (flo * fm < 0) hi = mid;
    else [lo, flo] = [mid, fm];
  }
  return (lo + hi) / 2;
}

/** Root of `f` (a rate > -1) near `guess`, or undefined. */
export function solveRate(f: (r: number) => number, guess = 0.1): number | undefined {
  const r = newton(f, guess);
  if (r !== undefined) return r;
  for (let i = 0; i < GRID.length; i++) {
    const a = GRID[i];
    const fa = f(a);
    if (fa === 0) return a;
    const b = GRID[i + 1];
    if (b === undefined) break;
    const fb = f(b);
    if (Number.isFinite(fa) && Number.isFinite(fb) && fa * fb < 0) return bisect(f, a, b);
  }
  return undefined;
}
