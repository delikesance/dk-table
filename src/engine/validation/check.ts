/**
 * Pure validation engine: does a raw cell value satisfy a rule, and which cells of a sheet break
 * the rules. Used on every write path (typing, paste, fill, import) so paste cannot bypass a rule.
 */
import { parseRange } from "../range";
import { makeKey } from "../address";
import type { Invalid, ValRule } from "./types";

/** Bounds wording, e.g. "entre 1 et 10", "≥ 0", "≤ 3". */
function bounds(r: ValRule): string {
  const [a, b] = [r.min, r.max];
  if (a !== undefined && b !== undefined) return `entre ${a} et ${b}`;
  return a !== undefined ? `≥ ${a}` : b !== undefined ? `≤ ${b}` : "";
}

/** Parse a number typed with "." or "," as decimal separator; NaN when not a number. */
function num(raw: string): number {
  const t = raw.trim().replace(",", ".");
  return t === "" ? NaN : Number(t);
}

/** Error message when `raw` breaks `rule`, null when valid. Empty and formulas (`=`) are skipped for numbers. */
export function checkValue(rule: ValRule, raw: string): string | null {
  if (raw === "") return null;
  const b = bounds(rule);
  const out = (v: number): boolean => (rule.min !== undefined && v < rule.min) || (rule.max !== undefined && v > rule.max);
  switch (rule.type) {
    case "whole":
    case "decimal": {
      if (raw.startsWith("=")) return null;
      const v = num(raw);
      const kind = rule.type === "whole" ? "un nombre entier" : "un nombre";
      if (Number.isNaN(v) || (rule.type === "whole" && !Number.isInteger(v))) return `Attendu : ${kind}${b && ` ${b}`}`;
      return out(v) ? `Attendu : ${kind} ${b}` : null;
    }
    case "list":
      return (rule.items ?? []).includes(raw) ? null : `Attendu : ${(rule.items ?? []).join(", ")}`;
    case "length":
      return out(raw.length) ? `Longueur attendue : ${b}` : null;
  }
}

/** Cells of the sheet (`cols` x `rows`) that break a rule (first failing rule per cell), row by row. */
export function invalidCells(rules: ValRule[], getRaw: (key: string) => string, cols: number, rows: number): Invalid[] {
  const seen = new Map<string, Invalid>();
  for (const rule of rules) {
    const r = parseRange(rule.range, { cols, rows });
    if (!r) continue;
    for (let row = r.r1; row <= r.r2; row++) for (let col = r.c1; col <= r.c2; col++) {
      const key = makeKey(col, row);
      if (seen.has(key)) continue;
      const raw = getRaw(key), message = checkValue(rule, raw);
      if (message) seen.set(key, { key, raw, message });
    }
  }
  const pos = (k: string): number => { const m = /^([A-Z]+)(\d+)$/.exec(k)!; return Number(m[2]) * 1e6 + [...m[1]].reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0); };
  return [...seen.values()].sort((a, b) => pos(a.key) - pos(b.key));
}
