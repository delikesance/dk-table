/** Dependency graph and recalculation: topological recompute of dependents, #CYCLE detection. */
import type { Node, Sheet, Value } from "./types";
import { getState, type State, type XDep } from "./state";
import { err, isErr } from "./types";
import { expandRange, inBounds } from "./address";
import { collectRefs, parseFormula } from "./parser";
import { evaluate, spillResult } from "./evaluator";
import { applySpill, releaseSpill, spillOwners } from "./spill";
import { isDecimal } from "./values";
import { isLongNumber } from "./longnum";
import { calcMode } from "./calc-mode";

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
 * topological order (Kahn). Cells left unordered are in/behind a cycle -> #CYCLE!,
 * or iterated when the workbook is iterative (see `solve`).
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
  return solve(sheet, st, affected, key, fixed);
}

/** Mode manuel : recalcule seulement `key` (sa valeur), sans ses dépendants (F9 les met à jour). */
export function recalcOne(sheet: Sheet, key: string): void {
  const st = getState(sheet);
  st.values.set(key, compute(sheet, st, key, new Set()));
}

/** Recalcul complet d'une feuille (F9 / Calculer la feuille) : toutes ses formules, en ordre topologique. */
export function recalcSheet(sheet: Sheet): void {
  const st = getState(sheet);
  solve(sheet, st, new Set(st.asts.keys()));
}

/**
 * Kahn over `affected` (`fixedKey` forced to `fixed` when given). Unordered cells are cycles
 * and their downstream: #CYCLE!, or iterated in place when the calc mode is iterative.
 */
function solve(sheet: Sheet, st: State, affected: Set<string>, fixedKey?: string, fixed?: Value): Set<string> {
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
    st.values.set(k, k === fixedKey && fixed !== undefined ? fixed : compute(sheet, st, k, touched));
    for (const d of st.deps.get(k) ?? []) {
      if (!affected.has(d) || !(st.prec.get(d)?.has(k))) continue;
      indeg.set(d, indeg.get(d)! - 1);
      if (indeg.get(d) === 0) queue.push(d);
    }
  }
  const left = [...affected].filter((k) => !done.has(k));
  if (left.length && calcMode().iterative) iterate(sheet, st, left, touched);
  else for (const k of left) st.values.set(k, err("#CYCLE!"));
  for (const k of touched) affected.add(k);
  return affected;
}

/** Écart entre deux valeurs : |b - a| pour les nombres, 0 si identiques, sinon infini. */
function gap(a: Value | undefined, b: Value): number {
  if (typeof a === "number" && typeof b === "number") return Math.abs(b - a);
  return JSON.stringify(a) === JSON.stringify(b) ? 0 : Infinity;
}

/**
 * Itératif : recalcule `cells` (ordre fixe) jusqu'à écart max < `maxChange` ou `maxIter` passes.
 * Départ à 0 pour les cellules sans valeur ou en erreur. Sans convergence, garde les dernières valeurs.
 */
function iterate(sheet: Sheet, st: State, cells: string[], touched: Set<string>): void {
  const { maxIter, maxChange } = calcMode();
  for (const k of cells) if (!st.values.has(k) || isErr(st.values.get(k)!)) st.values.set(k, 0);
  for (let i = 0; i < maxIter; i++) {
    let delta = 0;
    for (const k of cells) {
      const prev = st.values.get(k);
      const next = compute(sheet, st, k, touched);
      st.values.set(k, next);
      delta = Math.max(delta, gap(prev, next));
    }
    if (delta < maxChange) return;
  }
}
