/** Dependency graph and recalculation: topological recompute of dependents, #CYCLE detection. */
import type { Node, Sheet, Value } from "./types";
import { getState, type State, type XDep } from "./state";
import { err } from "./types";
import { expandRange, inBounds } from "./address";
import { collectRefs, parseFormula } from "./parser";
import { evaluate, spillResult } from "./evaluator";
import { applySpill, releaseSpill, spillOwners } from "./spill";
import { isDecimal } from "./values";
import { isLongNumber } from "./longnum";

export { getState, type State };

/**
 * Parse a non-formula raw string: decimal text -> number (0x/0b/0o stay text),
 * a leading apostrophe forces text (apostrophe dropped), >15 significant digits stay exact text (see longnum.ts), else text.
 */
function literal(raw: string): Value {
  if (raw.startsWith("'")) return raw.slice(1);
  const t = raw.trim();
  if (isLongNumber(t)) return t;
  if (isDecimal(t) && Number.isFinite(Number(t))) return Number(t);
  return raw;
}

/** Parse the formula (or clear the AST) for a cell and rewire its edges. */
export function rewire(sheet: Sheet, key: string): void {
  const st = getState(sheet);
  for (const p of st.prec.get(key) ?? []) st.deps.get(p)?.delete(key);
  st.prec.delete(key);
  st.xprec.delete(key);
  st.asts.delete(key);
  const raw = sheet.cells[key]?.raw ?? "";
  if (!raw.startsWith("=")) return;
  let ast: Node;
  try {
    ast = parseFormula(raw.slice(1));
  } catch {
    ast = { t: "err", code: "#VALUE!" };
  }
  st.asts.set(key, ast);
  const precs = new Set<string>();
  const xdeps: XDep[] = [];
  for (const r of collectRefs(ast)) {
    if (r.t === "xref") xdeps.push({ sheet: r.sheet.toLowerCase(), a: r.key, b: r.key });
    if (r.t === "xrange") xdeps.push({ sheet: r.sheet.toLowerCase(), a: r.a, b: r.b });
    const keys = r.t === "ref" ? (inBounds(sheet, r.key) ? [r.key] : []) : r.t === "range" ? expandRange(sheet, r.a, r.b) ?? [] : [];
    keys.forEach((k) => precs.add(k));
  }
  st.prec.set(key, precs);
  if (xdeps.length) st.xprec.set(key, xdeps);
  for (const p of precs) {
    if (!st.deps.has(p)) st.deps.set(p, new Set());
    st.deps.get(p)!.add(key);
  }
}

/** Compute one cell's value from its raw text / AST using current values; a spill formula also fills its zone. */
function compute(sheet: Sheet, st: State, key: string, touched: Set<string>): Value {
  const touch = (k: string, v?: Value) => { for (const a of recalc(sheet, k, v)) touched.add(a); };
  releaseSpill(sheet, st, key, touch);
  const ast = st.asts.get(key);
  if (!ast) return literal(sheet.cells[key]?.raw ?? "");
  const get = (k: string) => st.values.get(k) ?? "";
  const sp = spillResult(ast, sheet, get);
  return sp ? applySpill(sheet, st, key, sp, touch) : evaluate(ast, sheet, get);
}

/** Heads whose spill zone (or blocked rectangle) contains `key`: they must be recomputed after an edit of `key`. */
export function spillHeads(sheet: Sheet, key: string): string[] {
  return spillOwners(getState(sheet), key);
}

/**
 * Incremental recalc: recompute `key` and all transitive dependents in
 * topological order (Kahn). Cells left unordered are in/behind a cycle -> #CYCLE!.
 * `fixed` forces the value of `key` itself (used to mark a cross-sheet cycle).
 * Returns the set of recomputed keys (for cross-sheet propagation).
 */
export function recalc(sheet: Sheet, key: string, fixed?: Value): Set<string> {
  const st = getState(sheet);
  const affected = new Set<string>([key]);
  const stack = [key];
  while (stack.length) {
    for (const d of st.deps.get(stack.pop()!) ?? [])
      if (!affected.has(d)) { affected.add(d); stack.push(d); }
  }
  const indeg = new Map<string, number>();
  for (const k of affected) {
    let n = 0;
    for (const p of st.prec.get(k) ?? []) if (affected.has(p)) n++;
    indeg.set(k, n);
  }
  const queue = [...affected].filter((k) => indeg.get(k) === 0);
  const done = new Set<string>();
  const touched = new Set<string>();
  while (queue.length) {
    const k = queue.pop()!;
    done.add(k);
    st.values.set(k, k === key && fixed !== undefined ? fixed : compute(sheet, st, k, touched));
    for (const d of st.deps.get(k) ?? []) {
      if (!affected.has(d) || !(st.prec.get(d)?.has(k))) continue;
      indeg.set(d, indeg.get(d)! - 1);
      if (indeg.get(d) === 0) queue.push(d);
    }
  }
  for (const k of affected) if (!done.has(k)) st.values.set(k, err("#CYCLE!"));
  for (const k of touched) affected.add(k);
  return affected;
}
