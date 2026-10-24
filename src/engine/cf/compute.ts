/**
 * Conditional formatting evaluation: `computeCf(rules, env)` gives the effective conditional
 * style of every matching cell. Rules are applied in priority order (first = highest): a style
 * property set by a rule is never overridden by a later one. Pure (reads through `CfEnv`).
 */
import { makeKey, parseKey } from "../address";
import type { CfEnv } from "./env";
import { ruleTest } from "./match";
import { barStyles, scaleStyles } from "./scale";
import type { CfRule, CfStyle } from "./types";

/** Upper bound of cells per rule (keeps a typo like A1:XFD9999 from freezing the UI). */
const MAX_CELLS = 200_000;

/** Cell keys of an A1 range list ("A1:B2, D4"), row-major; `$` ignored, malformed parts skipped. */
export function cellsOf(range: string): string[] {
  const out: string[] = [];
  for (const part of range.replace(/\$/g, "").split(/[,;]/)) {
    const [a, b = a] = part.trim().split(":");
    const p = parseKey(a ?? ""), q = parseKey(b ?? "");
    if (!p || !q) continue;
    for (let r = Math.min(p.row, q.row); r <= Math.max(p.row, q.row); r++)
      for (let c = Math.min(p.col, q.col); c <= Math.max(p.col, q.col); c++) {
        if (out.length >= MAX_CELLS) return out;
        out.push(makeKey(c, r));
      }
  }
  return out;
}

/** Add `st` under `key`, keeping properties already set by higher-priority rules. */
function merge(out: Map<string, CfStyle>, key: string, st: CfStyle): void {
  const cur: CfStyle = { ...out.get(key) };
  for (const [p, v] of Object.entries(st) as [keyof CfStyle, never][]) if (v !== undefined && cur[p] === undefined) cur[p] = v;
  if (Object.keys(cur).length) out.set(key, cur);
}

/** Effective conditional style per cell key (cells without a match are absent). */
export function computeCf(rules: readonly CfRule[], env: CfEnv): Map<string, CfStyle> {
  const out = new Map<string, CfStyle>();
  for (const rule of rules) {
    const keys = cellsOf(rule.range);
    if (!keys.length) continue;
    if (rule.type === "scale") { for (const [k, st] of scaleStyles(rule, keys, env)) merge(out, k, st); continue; }
    if (rule.type === "bar") { for (const [k, st] of barStyles(rule.color, keys, env)) merge(out, k, st); continue; }
    const test = ruleTest(rule, keys, env);
    for (const k of keys) if (test(env.read(k), k)) merge(out, k, rule.format);
  }
  return out;
}
