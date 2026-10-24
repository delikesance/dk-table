/** Lien entre filtres de colonnes (vue) et lignes affichées: lignes visibles, pistes CSS, navigation. */
import { buildMask, combineMasks } from "./filter";
import { ROW_H } from "./virtual";

/**
 * Indices des lignes visibles (croissants) selon les filtres {colonne: valeurs cochées}, ou null sans filtre.
 * La ligne 0 (en-tête) n'est jamais masquée. `display(col,row)` donne le texte affiché.
 */
export function visibleRows(filters: Record<number, string[]>, rows: number, display: (col: number, row: number) => string): number[] | null {
  const cols = Object.keys(filters).map(Number);
  if (cols.length === 0) return null;
  const masks = cols.map((c) => {
    const data = Array.from({ length: rows }, (_, r) => { const a: string[] = []; a[c] = display(c, r); return a; });
    return buildMask(data, c, new Set(filters[c]), { hasHeader: true });
  });
  const mask = combineMasks(masks);
  return mask.flatMap((v, i) => (v ? [i] : []));
}

/** `grid-template-rows`: en-tête puis ROW_H px par ligne visible, 0px par ligne masquée (pistes regroupées). */
export function rowTracks(rows: number, visible: number[] | null): string {
  if (!visible) return `var(--col-header-h) repeat(${rows}, ${ROW_H}px)`;
  const shown = new Set(visible);
  const runs: string[] = [];
  let r = 0;
  while (r < rows) {
    const on = shown.has(r);
    let n = 0;
    while (r < rows && shown.has(r) === on) { n++; r++; }
    runs.push(`repeat(${n}, ${on ? ROW_H : 0}px)`);
  }
  return ["var(--col-header-h)", ...runs].join(" ");
}

/** Ligne atteinte en bougeant de `dr` lignes visibles (ou jusqu'au bord si `jump`), bornée. */
export function stepRow(visible: number[] | null, row: number, dr: number, rows: number, jump: boolean): number {
  if (!visible) return jump ? (dr < 0 ? 0 : rows - 1) : Math.max(0, Math.min(rows - 1, row + dr));
  if (jump) return dr < 0 ? visible[0] : visible[visible.length - 1];
  let i = visible.findIndex((r) => r >= row);
  if (i < 0) i = visible.length - 1;
  else if (visible[i] !== row && dr > 0) i -= 1; // hidden start row: the next visible one is a first step
  return visible[Math.max(0, Math.min(visible.length - 1, i + dr))];
}
