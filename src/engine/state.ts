/** Per-sheet derived state (values, ASTs, local + external dependency edges), shared by recalc and evaluator. */
import type { Node, Sheet, Value } from "./types";

/** One external (other-sheet) dependency: lower-cased sheet name + rectangle `a:b` (a = b for a single cell). */
export interface XDep {
  sheet: string;
  a: string;
  b: string;
}

/** Per-sheet derived state: values, parsed formulas and the dependency graph. */
export interface State {
  values: Map<string, Value>;
  asts: Map<string, Node>;
  /** key -> cells it reads. */
  prec: Map<string, Set<string>>;
  /** key -> cells that read it. */
  deps: Map<string, Set<string>>;
  /** key -> cells of other sheets it reads (only formulas with qualified refs). */
  xprec: Map<string, XDep[]>;
}

const states = new WeakMap<Sheet, State>();

/** Get (lazily creating) the derived state of a sheet. */
export function getState(sheet: Sheet): State {
  let s = states.get(sheet);
  if (!s) {
    s = { values: new Map(), asts: new Map(), prec: new Map(), deps: new Map(), xprec: new Map() };
    states.set(sheet, s);
  }
  return s;
}
