/**
 * Carte des dépendances d'une cellule : « Qui utilise cette cellule ? » (dépendants) et « D'où vient-elle ? » (précédents).
 * Couvre les liens entre feuilles, les cellules vivantes (SPARKLINE/BAR/TREND) et les documents dk doc
 * (puces `{{@id!B3}}`, calculs `{{=…}}`, blocs ```dkblock```). Pur : lit le `DktDoc`, ne recalcule rien.
 */
import { parseFormula } from "../parser";
import { toEngine } from "../../doc/calcSrc";
import { parseRef, parseCalc, parseBlock, BLOCK_LANG } from "../../doc/md/chip";
import { cellsInRef, indexFormulas, refHits, refsOf, type FRef } from "./formulaIndex";
import type { DktDoc } from "../../io/types";

/** Un lien : cellule (`key`), cellule vivante ou document (`key` vide, `sheetId` = id du document). */
export interface DepRef { sheetId: string; sheet: string; key: string; kind: "cell" | "live" | "doc" }
/** Précédents et dépendants directs. */
export interface DepMap { precedents: DepRef[]; dependents: DepRef[] }

const LIVE = /^=\s*(SPARKLINE|BAR|TREND)\s*\(/i;
const FENCE = new RegExp("```" + BLOCK_LANG + "\n([^\n]*)\n```", "g");
const CHIP = /\{\{([@=])((?:(?!\}\})[^\n])*)\}\}/g;

/** Références (feuille par id) citées par le texte stocké d'un document. */
export function docRefs(md: string, doc: DktDoc): FRef[] {
  const out: FRef[] = [];
  const add = (sheetId: string, ref: string): void => { const [a, b = a] = ref.split(":"); out.push({ sheetId, a, b }); };
  for (const m of md.matchAll(CHIP)) {
    if (m[1] === "@") { const t = parseRef(m[2]); if (t) add(t.sheet, t.ref); continue; }
    try { out.push(...refsOf(parseFormula(toEngine(parseCalc(m[2]).src, doc.sheets)), "", doc.sheets)); } catch { /* calcul illisible */ }
  }
  for (const m of md.matchAll(FENCE)) { const b = parseBlock(m[1]); if (b) add(b.sheet, b.ref); }
  return out.filter((r) => r.sheetId !== "");
}

/** Précédents et dépendants directs de la cellule `key` de la feuille `sheetId`. */
export function dependencyMap(doc: DktDoc, sheetId: string, key: string): DepMap {
  const precedents: DepRef[] = [];
  const dependents: DepRef[] = [];
  const seen = new Set<string>();
  for (const f of indexFormulas(doc)) {
    if (f.sheetId === sheetId && f.key === key) {
      for (const r of f.refs) {
        const t = doc.sheets.find((s) => s.id === r.sheetId);
        if (!t) continue;
        const keys = r.a === r.b ? [r.a] : cellsInRef(t, r.a, r.b);
        for (const k of keys) {
          const id = `${t.id}!${k}`;
          if (!seen.has(id)) { seen.add(id); precedents.push({ sheetId: t.id, sheet: t.name, key: k, kind: "cell" }); }
        }
      }
    }
    if (f.refs.some((r) => refHits(r, sheetId, key)) && !(f.sheetId === sheetId && f.key === key)) {
      dependents.push({ sheetId: f.sheetId, sheet: f.sheet, key: f.key, kind: LIVE.test(f.raw) ? "live" : "cell" });
    }
  }
  for (const d of doc.docs ?? []) {
    if (docRefs(d.md, doc).some((r) => refHits(r, sheetId, key))) dependents.push({ sheetId: d.id, sheet: d.name, key: "", kind: "doc" });
  }
  return { precedents, dependents };
}
