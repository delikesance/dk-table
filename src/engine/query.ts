/**
 * Mini Power Query : suite d'étapes visibles (filtrer, scinder, dédoublonner, pivoter)
 * appliquée à une table de chaînes (1re ligne = en-têtes), rejouable sur une source modifiée.
 * Module pur; `queryToLua` convertit la suite en macro Lua. Détail : `docs/query.md`.
 */
import { pivot, type PivotSpec } from "./pivot";
import { splitLine } from "./textsplit";
import { parseKey, makeKey } from "./address";
import { setCell, type Sheet } from "./sheet";

/** Comparateurs du filtre. */
export type FilterOp = "=" | "!=" | ">" | "<" | "contient";

/** Une étape de la requête. */
export type Step =
  | { kind: "filter"; col: string; op: FilterOp; value: string }
  | { kind: "split"; col: string; delim: string }
  | { kind: "dedupe"; cols?: string[] }
  | { kind: "pivot"; spec: PivotSpec };

const num = (s: string): number | null => {
  const t = s.trim().replace(",", ".");
  return t !== "" && Number.isFinite(Number(t)) ? Number(t) : null;
};

/** Vrai si `cell` satisfait `op value` (numérique si les deux côtés sont des nombres). */
function test(cell: string, op: FilterOp, value: string): boolean {
  const a = num(cell), b = num(value);
  if (op === "contient") return cell.toLowerCase().includes(value.toLowerCase());
  if (op === "=" || op === "!=") return (a !== null && b !== null ? a === b : cell === value) === (op === "=");
  if (a === null || b === null) return false;
  return op === ">" ? a > b : a < b;
}

/** Applique une étape; `[]` si une colonne est inconnue. */
function apply(t: string[][], s: Step): string[][] {
  if (s.kind === "pivot") return pivot(t, s.spec);
  const head = t[0] ?? [];
  if (s.kind === "dedupe") {
    const idx = (s.cols ?? head).map((c) => head.indexOf(c));
    if (idx.includes(-1)) return [];
    const seen = new Set<string>();
    return t.filter((r, i) => i === 0 || !seen.has(idx.map((k) => r[k]).join("\u0000")) && !!seen.add(idx.map((k) => r[k]).join("\u0000")));
  }
  const k = head.indexOf(s.col);
  if (k < 0) return [];
  if (s.kind === "filter") return t.filter((r, i) => i === 0 || test(r[k] ?? "", s.op, s.value));
  const parts = t.slice(1).map((r) => splitLine(r[k] ?? "", { delims: [s.delim] }));
  const n = Math.max(1, ...parts.map((p) => p.length));
  const names = Array.from({ length: n }, (_, j) => `${s.col} ${j + 1}`);
  const rep = (r: string[], p: string[]) => [...r.slice(0, k), ...names.map((_, j) => p[j] ?? ""), ...r.slice(k + 1)];
  return [rep(head, names.map(() => "")).map((v, j) => (j >= k && j < k + n ? names[j - k] : v)), ...t.slice(1).map((r, i) => rep(r, parts[i]))];
}

/** Rejoue toutes les étapes sur `table`. */
export function runQuery(table: string[][], steps: Step[]): string[][] {
  return steps.reduce((t, s) => (t.length ? apply(t, s) : t), table);
}

/** Texte lisible d'une étape (liste des étapes du dialogue). */
export function stepLabel(s: Step): string {
  if (s.kind === "filter") return `Filtrer ${s.col} ${s.op} ${s.value}`;
  if (s.kind === "split") return `Scinder ${s.col} sur « ${s.delim} »`;
  if (s.kind === "dedupe") return `Dédoublonner${s.cols ? ` (${s.cols.join(", ")})` : ""}`;
  return `Pivoter ${s.spec.row} / ${s.spec.agg} ${s.spec.value}`;
}

/** Table de chaînes (zone utilisée depuis A1) d'un ensemble de cellules brutes. */
export function tableOf(cells: Record<string, { raw: string }>): string[][] {
  const at: [number, number, string][] = [];
  let rows = 0, cols = 0;
  for (const [k, c] of Object.entries(cells)) {
    const p = parseKey(k);
    if (!p || c.raw === "") continue;
    rows = Math.max(rows, p.row); cols = Math.max(cols, p.col); at.push([p.row, p.col, c.raw]);
  }
  const g = Array.from({ length: rows }, () => Array<string>(cols).fill(""));
  for (const [r, c, v] of at) g[r - 1][c - 1] = v;
  return g;
}

/** Rejeu : vide `dst` puis y écrit le résultat des étapes sur `table` (recalcule les dépendants). */
export function replayInto(dst: Sheet, table: string[][], steps: Step[]): void {
  for (const k of Object.keys(dst.cells)) setCell(dst, k, "");
  runQuery(table, steps).forEach((row, r) => row.forEach((v, c) => { if (v !== "") setCell(dst, makeKey(c + 1, r + 1), v); }));
}
