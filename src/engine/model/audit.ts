/**
 * Audit de modèle (local, sans IA) : constantes codées en dur dans les formules, formules incohérentes dans une
 * colonne, plages qui ratent la ligne juste en dessous, fonctions volatiles, cycles. Pur : lit le `DktDoc`.
 * Usage : `auditModel(doc)` -> liste de constats, cliquables dans `ui/dialogs/audit.ts`.
 */
import { parseKey } from "../address";
import type { Node } from "../types";
import { indexFormulas, refHits, type FCell } from "./formulaIndex";
import type { DktDoc } from "../../io/types";

/** Famille d'un constat. */
export type FindingKind = "constant" | "inconsistent" | "range" | "volatile" | "cycle";
/** Un constat sur une cellule. */
export interface Finding { kind: FindingKind; sheetId: string; sheet: string; key: string; message: string }

const OK_NUMS = new Set([0, 1, 2, 100]);
/** Fonctions dont les arguments numériques sont des paramètres (décimales, positions), pas des hypothèses. */
const PARAM_FNS = new Set(["ROUND", "ROUNDUP", "ROUNDDOWN", "INDEX", "MATCH", "VLOOKUP", "HLOOKUP", "OFFSET", "LEFT", "RIGHT", "MID", "TEXT", "CHOOSE", "ROW", "COLUMN", "DATE", "MROUND"]);
const VOLATILE = new Set(["NOW", "TODAY", "RAND", "RANDBETWEEN", "OFFSET", "INDIRECT"]);

/** Constantes numériques « métier » d'un AST (hors paramètres de fonctions de positionnement). */
function constants(n: Node, out: number[] = [], inParam = false): number[] {
  if (n.t === "num") { if (!inParam && !OK_NUMS.has(n.v)) out.push(n.v); }
  else if (n.t === "neg" || n.t === "pct") constants(n.e, out, inParam);
  else if (n.t === "bin") { constants(n.l, out, inParam); constants(n.r, out, inParam); }
  else if (n.t === "call") n.args.forEach((a) => constants(a, out, inParam || PARAM_FNS.has(n.name.toUpperCase())));
  return out;
}

/** Noms de fonctions appelés dans un AST. */
function calls(n: Node, out: string[] = []): string[] {
  if (n.t === "call") { out.push(n.name.toUpperCase()); n.args.forEach((a) => calls(a, out)); }
  else if (n.t === "neg" || n.t === "pct") calls(n.e, out);
  else if (n.t === "bin") { calls(n.l, out); calls(n.r, out); }
  return out;
}

/** Forme relative d'une formule (références en décalages R[l]C[c], `$` = absolu) pour comparer les lignes d'une colonne. */
export function relativeForm(raw: string, key: string): string {
  const me = parseKey(key)!;
  return raw.replace(/(\$?)([A-Z]{1,3})(\$?)(\d+)/g, (m, ca: string, col: string, ra: string, row: string) => {
    const p = parseKey(`${col}${row}`);
    if (!p) return m;
    return `R${ra ? row : `[${p.row - me.row}]`}C${ca ? col : `[${p.col - me.col}]`}`;
  });
}

const find = (f: Pick<FCell, "sheetId" | "sheet" | "key">, kind: FindingKind, message: string): Finding =>
  ({ kind, sheetId: f.sheetId, sheet: f.sheet, key: f.key, message });
const byKey = (a: Finding, b: Finding): number => a.key.length - b.key.length || (a.key < b.key ? -1 : 1);

/** Formules incohérentes : par colonne (au moins 3 formules), motif majoritaire (60 %) et écarts (autre motif ou constante). */
function inconsistent(doc: DktDoc, all: FCell[]): Finding[] {
  const out: Finding[] = [];
  for (const s of doc.sheets) {
    const byCol = new Map<number, { key: string; row: number; form?: string }[]>();
    for (const k of Object.keys(s.cells)) {
      const p = parseKey(k);
      if (!p) continue;
      const f = all.find((x) => x.sheetId === s.id && x.key === k);
      const list = byCol.get(p.col) ?? [];
      list.push({ key: k, row: p.row, form: f ? relativeForm(f.raw, k) : undefined });
      byCol.set(p.col, list);
    }
    for (const cells of byCol.values()) {
      const forms = cells.filter((c) => c.form);
      if (forms.length < 3) continue;
      const count = new Map<string, number>();
      forms.forEach((c) => count.set(c.form!, (count.get(c.form!) ?? 0) + 1));
      const [top, n] = [...count.entries()].sort((a, b) => b[1] - a[1])[0];
      if (n / forms.length < 0.6 || n < 3) continue;
      const lo = Math.min(...forms.map((c) => c.row)), hi = Math.max(...forms.map((c) => c.row));
      for (const c of cells) {
        if (c.row < lo || c.row > hi || c.form === top) continue;
        out.push(find({ sheetId: s.id, sheet: s.name, key: c.key }, "inconsistent",
          c.form ? "Formule différente du reste de la colonne" : "Valeur saisie au milieu d'une colonne de formules"));
      }
    }
  }
  return out.sort(byKey);
}

/** Cellules appartenant à un cycle (graphe formule -> formules qu'elle lit). */
function cycles(all: FCell[]): FCell[] {
  const edges = new Map<FCell, FCell[]>();
  for (const f of all) {
    const to = new Set<FCell>();
    for (const r of f.refs) for (const g of all) if (refHits(r, g.sheetId, g.key)) to.add(g);
    edges.set(f, [...to]);
  }
  const reach = (from: FCell): Set<FCell> => {
    const seen = new Set<FCell>(), stack = [...(edges.get(from) ?? [])];
    while (stack.length) { const x = stack.pop()!; if (seen.has(x)) continue; seen.add(x); stack.push(...(edges.get(x) ?? [])); }
    return seen;
  };
  return all.filter((f) => reach(f).has(f));
}

/** Plage de `f` qui s'arrête juste avant une cellule remplie (nouvelle ligne ratée), ou null. */
function missedRow(doc: DktDoc, f: FCell): string | null {
  for (const r of f.refs) {
    const s = doc.sheets.find((x) => x.id === r.sheetId), end = parseKey(r.b);
    if (!s || r.a === r.b || !end || !/^[A-Za-z]+\d+$/.test(r.b)) continue;
    const below = `${r.b.replace(/\d+$/, "")}${end.row + 1}`.toUpperCase();
    if ((s.cells[below]?.raw ?? "") !== "" && !(s.id === f.sheetId && below === f.key)) return `La plage ${r.a}:${r.b} s'arrête avant ${below}, qui contient une valeur`;
  }
  return null;
}

/** Audite le classeur; constats triés par type puis cellule. */
export function auditModel(doc: DktDoc): Finding[] {
  const all = indexFormulas(doc);
  const out: Finding[] = [];
  for (const f of all) {
    if (!f.ast) continue;
    const k = constants(f.ast);
    if (k.length) out.push(find(f, "constant", `Constante codée en dur : ${k.join(", ")}`));
    const v = calls(f.ast).filter((n) => VOLATILE.has(n));
    if (v.length) out.push(find(f, "volatile", `Fonction volatile : ${[...new Set(v)].join(", ")}`));
    const m = missedRow(doc, f);
    if (m) out.push(find(f, "range", m));
  }
  out.push(...inconsistent(doc, all));
  out.push(...cycles(all).map((f) => find(f, "cycle", "Référence circulaire")));
  const order: FindingKind[] = ["cycle", "inconsistent", "range", "constant", "volatile"];
  return out.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
}
