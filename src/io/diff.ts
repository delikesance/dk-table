/**
 * Diff et fusion à 3 voies cellule par cellule (module pur, sans UI ni fichier).
 * Les cellules sont des tables `clé A1 -> texte brut` ; une cellule absente = vide.
 * Conflit seulement si les deux côtés changent la même cellule vers des valeurs différentes.
 */
import type { DktDoc, DocSheet } from "./types";

/** Une différence de cellule entre deux versions. */
export interface CellChange { key: string; kind: "add" | "del" | "mod"; from: string; to: string }
/** Conflit de fusion : la cellule diffère des deux côtés (`""` = supprimée). */
export interface Conflict { key: string; base: string; ours: string; theirs: string }
/** Résultat d'une fusion : `merged` garde nos valeurs sur les cellules en conflit. */
export interface MergeResult { merged: Record<string, string>; conflicts: Conflict[] }

const keyOrder = (a: string, b: string): number => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0);
const get = (m: Record<string, string>, k: string): string => m[k] ?? "";
const keysOf = (...ms: Record<string, string>[]): string[] => [...new Set(ms.flatMap((m) => Object.keys(m)))].sort(keyOrder);

/** Différences de `a` vers `b`, triées par clé. */
export function diffCells(a: Record<string, string>, b: Record<string, string>): CellChange[] {
  const out: CellChange[] = [];
  for (const key of keysOf(a, b)) {
    const from = get(a, key), to = get(b, key);
    if (from === to) continue;
    out.push({ key, from, to, kind: from === "" ? "add" : to === "" ? "del" : "mod" });
  }
  return out;
}

/** Fusion à 3 voies de `ours` et `theirs` par rapport à `base`. */
export function merge3(base: Record<string, string>, ours: Record<string, string>, theirs: Record<string, string>): MergeResult {
  const merged: Record<string, string> = {};
  const conflicts: Conflict[] = [];
  for (const key of keysOf(base, ours, theirs)) {
    const b = get(base, key), o = get(ours, key), t = get(theirs, key);
    let v = o;
    if (o === b) v = t;
    else if (t !== b && t !== o) conflicts.push({ key, base: b, ours: o, theirs: t });
    if (v !== "") merged[key] = v;
  }
  return { merged, conflicts };
}

/** Différences d'une feuille entre deux documents. */
export interface SheetDiff { id: string; name: string; status: "added" | "removed" | "changed" | "same"; changes: CellChange[] }

const raws = (cells: Record<string, { raw: string }> | undefined): Record<string, string> =>
  Object.fromEntries(Object.entries(cells ?? {}).map(([k, c]) => [k, c.raw]));

/** Diff de deux documents, feuille par feuille (appariées par id, à défaut par nom). */
export function diffDocs(a: DktDoc, b: DktDoc): SheetDiff[] {
  const out: SheetDiff[] = [];
  const used = new Set<DocSheet>();
  for (const s of a.sheets) {
    const t = b.sheets.find((x) => x.id === s.id) ?? b.sheets.find((x) => x.name === s.name && !a.sheets.some((y) => y.id === x.id));
    if (t) used.add(t);
    if (!t) { out.push({ id: s.id, name: s.name, status: "removed", changes: diffCells(raws(s.cells), {}) }); continue; }
    const changes = diffCells(raws(s.cells), raws(t.cells));
    out.push({ id: s.id, name: t.name, status: changes.length ? "changed" : "same", changes });
  }
  for (const t of b.sheets) if (!used.has(t)) out.push({ id: t.id, name: t.name, status: "added", changes: diffCells({}, raws(t.cells)) });
  return out;
}
