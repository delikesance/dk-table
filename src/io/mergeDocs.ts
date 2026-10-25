/**
 * Fusion à 3 voies de classeurs entiers, feuille par feuille (pur, sans UI).
 * Les feuilles sont celles du classeur « nôtre » ; base et « leur » sont appariées par id, à défaut par nom
 * (absente = feuille vide). Usage : `mergeDocs(base, ours, theirs)`.
 */
import { merge3, type Conflict } from "./diff";
import type { DktDoc, DocSheet } from "./types";

/** Résultat de fusion d'une feuille. */
export interface SheetMerge { id: string; name: string; merged: Record<string, string>; conflicts: Conflict[] }

const raws = (s: DocSheet | undefined): Record<string, string> =>
  Object.fromEntries(Object.entries(s?.cells ?? {}).map(([k, c]) => [k, c.raw]));

const find = (d: DktDoc, s: DocSheet): DocSheet | undefined =>
  d.sheets.find((x) => x.id === s.id) ?? d.sheets.find((x) => x.name === s.name);

/** Fusionne `ours` et `theirs` par rapport à `base` ; en conflit, `merged` garde nos valeurs. */
export function mergeDocs(base: DktDoc, ours: DktDoc, theirs: DktDoc): SheetMerge[] {
  return ours.sheets.map((s) => {
    const { merged, conflicts } = merge3(raws(find(base, s)), raws(s), raws(find(theirs, s)));
    return { id: s.id, name: s.name, merged, conflicts };
  });
}
