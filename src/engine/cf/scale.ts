/** Color scales and data bars: per-cell styles computed from the numeric values of the range. */
import type { CfEnv } from "./env";
import type { CfStyle } from "./types";

/** `#rgb` / `#rrggbb` to [r, g, b]; null when malformed. */
export function hexRgb(hex: string): [number, number, number] | null {
  let h = hex.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(h)) h = h.replace(/./g, (c) => c + c);
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

/** Linear mix of two colors (`t` = 0 gives `a`, 1 gives `b`) as `#rrggbb`. */
export function mix(a: string, b: string, t: number): string {
  const x = hexRgb(a) ?? [255, 255, 255], y = hexRgb(b) ?? [255, 255, 255];
  const k = Math.max(0, Math.min(1, t));
  return `#${x.map((c, i) => Math.round(c + (y[i] - c) * k).toString(16).padStart(2, "0")).join("")}`;
}

/** Median of sorted numbers. */
const median = (s: number[]): number => (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2);

/** Numeric cells of the range, with their keys. */
function numericCells(keys: string[], env: CfEnv): [string, number][] {
  const out: [string, number][] = [];
  for (const k of keys) {
    const v = env.read(k);
    if (typeof v === "number") out.push([k, v]);
  }
  return out;
}

/** Fill of each numeric cell on a 2- or 3-color scale (midpoint = median). */
export function scaleStyles(r: { min: string; mid?: string; max: string }, keys: string[], env: CfEnv): [string, CfStyle][] {
  const cells = numericCells(keys, env);
  if (!cells.length) return [];
  const sorted = cells.map(([, v]) => v).sort((a, b) => a - b);
  const lo = sorted[0], hi = sorted[sorted.length - 1];
  const t = (v: number, a: number, b: number) => (b > a ? (v - a) / (b - a) : 0);
  if (!r.mid) return cells.map(([k, v]) => [k, { fill: mix(r.min, r.max, t(v, lo, hi)) }]);
  const m = median(sorted);
  return cells.map(([k, v]) => [k, { fill: v <= m ? mix(r.min, r.mid!, t(v, lo, m)) : mix(r.mid!, r.max, t(v, m, hi)) }]);
}

/** Data bar of each numeric cell, scaled from min(0, values) to max(0, values). */
export function barStyles(color: string, keys: string[], env: CfEnv): [string, CfStyle][] {
  const cells = numericCells(keys, env);
  const lo = Math.min(0, ...cells.map(([, v]) => v)), hi = Math.max(0, ...cells.map(([, v]) => v));
  if (hi <= lo) return [];
  return cells.map(([k, v]) => [k, { bar: { pct: Math.round(((v - lo) / (hi - lo)) * 100), color } }]);
}
