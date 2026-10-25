/**
 * Adapter between the pure `live` mini-charts and the engine/grid.
 * Engine side: SPARKLINE/BAR/TREND are registered with a plain-text fallback
 * (so exports, dependents and the sidebar stay textual). Grid side: `liveHtml`
 * turns the same formula into the {kind:'html'} result shown in-cell.
 */
import { registerFunction } from "../functions";
import { liveFunctions, trendInfo, type LiveResult } from "./index";

/** Matches a whole-cell live formula: =NAME(A1:A5), =NAME(A1) or an open range (B2:B, B:B, 2:2); `$` allowed. */
const LIVE_RE = /^=\s*(SPARKLINE|BAR|TREND)\s*\(\s*(\$?[A-Za-z]*\$?\d*(?::\$?[A-Za-z]*\$?\d*)?)\s*\)\s*$/i;

/** Register the live functions in the engine (text fallback as cell value). */
export function registerLive(): void {
  registerFunction("SPARKLINE", () => "");
  registerFunction("BAR", () => "");
  registerFunction("TREND", (n) => trendInfo(n).label);
}

/**
 * Live result for a raw formula, or null when it is not a live formula.
 * `range` resolves a range like "A1:A5" to numbers (engine getRangeValues).
 */
export function liveResult(raw: string, range: (r: string) => number[]): LiveResult | null {
  const m = LIVE_RE.exec(raw);
  if (!m) return null;
  const name = m[1].toUpperCase() as keyof typeof liveFunctions;
  return liveFunctions[name](range(m[2]));
}
