/**
 * Index des formules d'un classeur persisté (`DktDoc`) : AST + références résolues vers des feuilles par id.
 * Base commune de la carte des dépendances, de l'audit et du profileur (modules purs, sans recalcul).
 */
import { parseFormula, collectRefs } from "../parser";
import { containsKey, rectOf } from "../openrange";
import { parseKey } from "../address";
import type { Node } from "../types";
import type { DktDoc, DocSheet } from "../../io/types";

/** Référence lue par une formule : feuille cible (id) et rectangle `a:b` (a = b pour une cellule). */
export interface FRef { sheetId: string; a: string; b: string }

/** Une cellule-formule du classeur. `ast` est null si la formule est illisible. */
export interface FCell { sheetId: string; sheet: string; key: string; raw: string; ast: Node | null; refs: FRef[] }

/** Vrai si la saisie brute est une formule. */
export const isFormula = (raw: string): boolean => raw.startsWith("=") && raw.length > 1;

/** Références d'un AST, feuilles résolues (nom insensible à la casse; inconnue = ignorée). */
export function refsOf(ast: Node, own: string, sheets: { id: string; name: string }[]): FRef[] {
  const out: FRef[] = [];
  for (const n of collectRefs(ast)) {
    const byName = (name: string): string | undefined => sheets.find((s) => s.name.toLowerCase() === name.toLowerCase())?.id;
    if (n.t === "ref") out.push({ sheetId: own, a: n.key, b: n.key });
    else if (n.t === "range") out.push({ sheetId: own, a: n.a, b: n.b });
    else if (n.t === "xref" || n.t === "xrange") {
      const id = byName(n.sheet);
      if (id) out.push({ sheetId: id, a: n.t === "xref" ? n.key : n.a, b: n.t === "xref" ? n.key : n.b });
    }
  }
  return out;
}

/** Toutes les formules du classeur, feuille par feuille. */
export function indexFormulas(doc: DktDoc): FCell[] {
  const out: FCell[] = [];
  for (const s of doc.sheets) {
    for (const [key, c] of Object.entries(s.cells)) {
      if (!isFormula(c.raw)) continue;
      let ast: Node | null = null;
      try { ast = parseFormula(c.raw.slice(1)); } catch { ast = null; }
      out.push({ sheetId: s.id, sheet: s.name, key, raw: c.raw, ast, refs: ast ? refsOf(ast, s.id, doc.sheets) : [] });
    }
  }
  return out;
}

/** Cellules non vides de `sheet` dans le rectangle `a:b` (bornes ouvertes coupées à la zone utilisée). */
export function cellsInRef(sheet: DocSheet, a: string, b: string): string[] {
  const r = rectOf({ cols: sheet.cols, rows: sheet.rows, cells: sheet.cells }, a, b, true);
  if (!r) return [];
  return Object.keys(sheet.cells).filter((k) => {
    const p = parseKey(k);
    return !!p && sheet.cells[k].raw !== "" && p.col >= r.c1 && p.col <= r.c2 && p.row >= r.r1 && p.row <= r.r2;
  });
}

/** Vrai si la référence couvre la cellule `key` de la feuille `sheetId`. */
export const refHits = (r: FRef, sheetId: string, key: string): boolean => r.sheetId === sheetId && containsKey(r.a, r.b, key);
