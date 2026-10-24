import type { Node, Sheet, Value } from "./types";
import { err } from "./types";
import { expandRange, inBounds } from "./address";
import { collectRefs, parseFormula } from "./parser";
import { evaluate } from "./evaluator";

/** Per-sheet derived state: values, parsed formulas and the dependency graph. */
export interface State {
  values: Map<string, Value>;
  asts: Map<string, Node>;
  /** key -> cells it reads. */
  prec: Map<string, Set<string>>;
  /** key -> cells that read it. */
  deps: Map<string, Set<string>>;
}

const states = new WeakMap<Sheet, State>();

/** Get (lazily creating) the derived state of a sheet. */
export function getState(sheet: Sheet): State {
  let s = states.get(sheet);
  if (!s) {
    s = { values: new Map(), asts: new Map(), prec: new Map(), deps: new Map() };
    states.set(sheet, s);
  }
  return s;
}

/** Parse a non-formula raw string: numeric text -> number, else text. */
function literal(raw: string): Value {
  const t = raw.trim();
  if (t !== "" && Number.isFinite(Number(t))) return Number(t);
  return raw;
}

/** Parse the formula (or clear the AST) for a cell and rewire its edges. */
export function rewire(sheet: Sheet, key: string): void {
  const st = getState(sheet);
  for (const p of st.prec.get(key) ?? []) st.deps.get(p)?.delete(key);
  st.prec.delete(key);
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
  for (const r of collectRefs(ast)) {
    const keys = r.t === "ref" ? (inBounds(sheet, r.key) ? [r.key] : []) : r.t === "range" ? expandRange(sheet, r.a, r.b) ?? [] : [];
    keys.forEach((k) => precs.add(k));
  }
  st.prec.set(key, precs);
  for (const p of precs) {
    if (!st.deps.has(p)) st.deps.set(p, new Set());
    st.deps.get(p)!.add(key);
  }
}

/** Compute one cell's value from its raw text / AST using current values. */
function compute(sheet: Sheet, st: State, key: string): Value {
  const ast = st.asts.get(key);
  if (!ast) return literal(sheet.cells[key]?.raw ?? "");
  return evaluate(ast, sheet, (k) => st.values.get(k) ?? "");
}

/**
 * Incremental recalc: recompute `key` and all transitive dependents in
 * topological order (Kahn). Cells left unordered are in/behind a cycle -> #CYCLE!.
 */
export function recalc(sheet: Sheet, key: string): void {
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
  while (queue.length) {
    const k = queue.pop()!;
    done.add(k);
    st.values.set(k, compute(sheet, st, k));
    for (const d of st.deps.get(k) ?? []) {
      if (!affected.has(d) || !(st.prec.get(d)?.has(k))) continue;
      indeg.set(d, indeg.get(d)! - 1);
      if (indeg.get(d) === 0) queue.push(d);
    }
  }
  for (const k of affected) if (!done.has(k)) st.values.set(k, err("#CYCLE!"));
}
