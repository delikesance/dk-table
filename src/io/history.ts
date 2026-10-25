/**
 * Historique local dans le fichier : journal par cellule (anciennes/nouvelles valeurs, enregistré à chaque
 * sauvegarde), voyage dans le temps (`rewind`), instantanés nommés. Module pur sur `DktDoc`.
 * La comparaison de deux états réutilise `diffDocs` (`io/diff.ts`).
 */
import { diffCells } from "./diff";
import type { DktDoc, History, HistoryEntry, Snapshot } from "./types";

/** Taille maximale du journal (les plus anciennes entrées sont oubliées). */
export const MAX_LOG = 5000;

/** Historique vide. */
export const emptyHistory = (): History => ({ log: [], snaps: [] });

const raws = (cells: Record<string, { raw: string }>): Record<string, string> =>
  Object.fromEntries(Object.entries(cells).map(([k, c]) => [k, c.raw]));

/** Ajoute au journal les cellules qui diffèrent entre `prev` et `next` (feuilles appariées par id), horodatées `t`. */
export function recordChanges(h: History, prev: DktDoc, next: DktDoc, t: number): History {
  const added: HistoryEntry[] = [];
  for (const s of next.sheets) {
    const before = prev.sheets.find((x) => x.id === s.id);
    for (const c of diffCells(raws(before?.cells ?? {}), raws(s.cells))) added.push({ t, sheet: s.id, key: c.key, from: c.from, to: c.to });
  }
  for (const s of prev.sheets) {
    if (next.sheets.some((x) => x.id === s.id)) continue;
    for (const c of diffCells(raws(s.cells), {})) added.push({ t, sheet: s.id, key: c.key, from: c.from, to: c.to });
  }
  return { ...h, log: [...h.log, ...added].slice(-MAX_LOG) };
}

/** Modifications d'une cellule, de la plus ancienne à la plus récente. */
export const cellHistory = (h: History, sheet: string, key: string): HistoryEntry[] =>
  h.log.filter((e) => e.sheet === sheet && e.key === key);

/** Instants (croissants, sans doublon) où le journal a enregistré des changements. */
export const timeline = (h: History): number[] => [...new Set(h.log.map((e) => e.t))].sort((a, b) => a - b);

/** État de `doc` tel qu'il était à l'instant `t` (annule les entrées plus récentes, de la dernière à la première). */
export function rewind(doc: DktDoc, h: History, t: number): DktDoc {
  const out: DktDoc = { ...doc, sheets: doc.sheets.map((s) => ({ ...s, cells: { ...s.cells } })) };
  for (const e of [...h.log].reverse()) {
    if (e.t <= t) continue;
    const s = out.sheets.find((x) => x.id === e.sheet);
    if (!s) continue;
    if (e.from === "") delete s.cells[e.key]; else s.cells[e.key] = { raw: e.from };
  }
  return out;
}

/** Ajoute un instantané nommé de l'état `doc`. */
export function addSnapshot(h: History, doc: DktDoc, name: string, t: number): History {
  const snap: Snapshot = {
    id: `snap${t.toString(36)}${h.snaps.length}`, name, t,
    sheets: doc.sheets.map((s) => ({ id: s.id, name: s.name, cells: raws(s.cells) })),
  };
  return { ...h, snaps: [...h.snaps, snap] };
}

/** `doc` dont les cellules des feuilles de l'instantané sont remplacées par celles de l'instantané. */
export function snapshotDoc(snap: Snapshot, doc: DktDoc): DktDoc {
  return {
    ...doc,
    sheets: doc.sheets.map((s) => {
      const t = snap.sheets.find((x) => x.id === s.id);
      return t ? { ...s, cells: Object.fromEntries(Object.entries(t.cells).map(([k, raw]) => [k, { raw }])) } : s;
    }),
  };
}
