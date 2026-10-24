/**
 * "Cellules vivantes": in-cell mini-charts (pure, no engine dependency).
 * Every function takes number[] and returns a safe, self-contained SVG/HTML
 * string (numbers only are interpolated, never user text).
 * Integration: register `liveFunctions` in the engine's function registry.
 */

/** Rendering options (pixels). Default cell size ~100x22. */
export interface LiveOpts {
  width?: number;
  height?: number;
}

/** Trend summary of a series (first vs last finite value). */
export interface TrendInfo {
  direction: "up" | "down" | "flat";
  pct: number;
  label: string;
}

/** Result a live function hands to the grid: HTML rendered in-cell. */
export interface LiveResult {
  kind: "html";
  html: string;
}

const ACCENT = "var(--c-accent, #3b4fd8)";
const SUCCESS = "var(--c-success, #1a7f45)";
const ERROR = "var(--c-error, #c4261d)";
const MUTED = "var(--c-text-muted, currentColor)";

/** Keep only finite numbers. */
const finite = (v: number[]): number[] => v.filter((x) => typeof x === "number" && Number.isFinite(x));

/** Round to 2 decimals for compact SVG output. */
const r2 = (n: number): number => Math.round(n * 100) / 100;

/** Open an svg tag sized for a cell. */
function open(w: number, h: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="live-chart" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-hidden="true">`;
}

/** Sparkline: polyline (+ end dot) of the series, accent coloured. */
export function sparklineSvg(values: number[], opts: LiveOpts = {}): string {
  const w = opts.width ?? 100, h = opts.height ?? 22, pad = 2;
  const v = finite(values);
  if (v.length === 0) return open(w, h) + "</svg>";
  const min = Math.min(...v), max = Math.max(...v), span = max - min;
  const x = (i: number) => (v.length === 1 ? w / 2 : pad + (i * (w - 2 * pad)) / (v.length - 1));
  const y = (n: number) => (span === 0 ? h / 2 : h - pad - ((n - min) * (h - 2 * pad)) / span);
  const pts = v.map((n, i) => `${r2(x(i))},${r2(y(n))}`).join(" ");
  const last = v.length - 1;
  return (
    open(w, h) +
    `<polyline points="${pts}" fill="none" stroke="${ACCENT}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<circle cx="${r2(x(last))}" cy="${r2(y(v[last]))}" r="2.5" fill="${ACCENT}"/></svg>`
  );
}

/** Mini bar chart: one rect per finite value, negatives hang below the zero line. */
export function barSvg(values: number[], opts: LiveOpts = {}): string {
  const w = opts.width ?? 100, h = opts.height ?? 22, pad = 1;
  const v = finite(values);
  if (v.length === 0) return open(w, h) + "</svg>";
  const lo = Math.min(0, ...v), hi = Math.max(0, ...v), span = hi - lo || 1;
  const zero = ((hi - 0) / span) * (h - 2 * pad) + pad;
  const slot = (w - 2 * pad) / v.length, bw = Math.max(1, slot - 2);
  const rects = v.map((n, i) => {
    const bh = Math.max(1, (Math.abs(n) / span) * (h - 2 * pad));
    const top = n >= 0 ? zero - bh : zero;
    return `<rect x="${r2(pad + i * slot)}" y="${r2(top)}" width="${r2(bw)}" height="${r2(bh)}" rx="1" fill="${n < 0 ? ERROR : ACCENT}"/>`;
  });
  return open(w, h) + rects.join("") + "</svg>";
}

/** Trend between first and last finite value; pct is relative to |first| (0 base: 100/-100). */
export function trendInfo(values: number[]): TrendInfo {
  const v = finite(values);
  if (v.length < 2) return { direction: "flat", pct: 0, label: "▶ 0%" };
  const a = v[0], b = v[v.length - 1], d = b - a;
  if (d === 0) return { direction: "flat", pct: 0, label: "▶ 0%" };
  const pct = Math.round(a === 0 ? Math.sign(d) * 100 : (d / Math.abs(a)) * 100);
  const up = d > 0;
  return { direction: up ? "up" : "down", pct, label: `${up ? "▲ +" : "▼ "}${pct}%` };
}

/** Coloured arrow + % (success up, error down, muted flat). */
export function trendHtml(values: number[]): string {
  const t = trendInfo(values);
  const c = t.direction === "up" ? SUCCESS : t.direction === "down" ? ERROR : MUTED;
  const word = t.direction === "up" ? `Hausse de ${t.pct} %` : t.direction === "down" ? `Baisse de ${Math.abs(t.pct)} %` : "Stable";
  return `<span class="live-trend" title="${word}" style="color:${c};font-weight:600;font-variant-numeric:tabular-nums">${t.label}</span>`;
}

/** Functions to register in the engine: name -> (numbers) => html result. */
export const liveFunctions: Record<"SPARKLINE" | "BAR" | "TREND", (nums: number[]) => LiveResult> = {
  SPARKLINE: (n) => ({ kind: "html", html: sparklineSvg(n) }),
  BAR: (n) => ({ kind: "html", html: barSvg(n) }),
  TREND: (n) => ({ kind: "html", html: trendHtml(n) }),
};
