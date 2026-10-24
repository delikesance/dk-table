/**
 * Tri A→Z / Z→A de la colonne active: opération de modèle (un seul pas d'undo).
 * Le bloc de données = rectangle englobant contigu autour de la cellule active;
 * les LIGNES ENTIÈRES (valeurs brutes + styles) suivent la permutation de `sortRows`.
 * Limite: les formules sont déplacées telles quelles (références non réécrites).
 */
import { getRaw, setCell } from "../engine/sheet";
import { detectHeader, sortRows } from "../engine/sort";
import { pushUndo, type CellStyle, type Entry } from "./model";

/** Lettres de colonne -> index 0-based. */
const colIndex = (s: string): number => [...s].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;

/** Index 0-based -> lettres de colonne. */
function colName(i: number): string {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

/** Rectangle de données {r0,r1,c0,c1} (0-based, inclusif) autour de `key`, ou null si rien. */
function findBlock(e: Entry, key: string) {
  const m = /^([A-Z]+)(\d+)$/.exec(key.toUpperCase());
  if (!m) return null;
  const filled = (r: number, c: number): boolean => r >= 0 && c >= 0 && getRaw(e.sheet, colName(c) + (r + 1)) !== "";
  const rowHas = (r: number, c0: number, c1: number) => { for (let c = c0; c <= c1; c++) if (filled(r, c)) return true; return false; };
  const colHas = (c: number, r0: number, r1: number) => { for (let r = r0; r <= r1; r++) if (filled(r, c)) return true; return false; };
  const col = colIndex(m[1]), row = Number(m[2]) - 1;
  if (!rowHas(row, col, col) && !colHas(col, 0, e.sheet.rows - 1)) return null;
  let b = { r0: row, r1: row, c0: col, c1: col };
  for (let changed = true; changed; ) {
    changed = false;
    if (b.r0 > 0 && rowHas(b.r0 - 1, b.c0, b.c1)) { b.r0--; changed = true; }
    if (b.r1 < e.sheet.rows - 1 && rowHas(b.r1 + 1, b.c0, b.c1)) { b.r1++; changed = true; }
    if (b.c0 > 0 && colHas(b.c0 - 1, b.r0, b.r1)) { b.c0--; changed = true; }
    if (b.c1 < e.sheet.cols - 1 && colHas(b.c1 + 1, b.r0, b.r1)) { b.c1++; changed = true; }
  }
  return { ...b, col };
}

/**
 * Trie le bloc de données contenant `activeKey` selon sa colonne (un seul pas d'undo).
 * @returns false (sans rien modifier ni empiler d'undo) si colonne vide ou bloc d'une seule ligne.
 */
export function sortColumn(e: Entry, activeKey: string, opts: { desc?: boolean }): boolean {
  const b = findBlock(e, activeKey);
  if (!b || b.r1 === b.r0) return false;
  const block: string[][] = [];
  for (let r = b.r0; r <= b.r1; r++) {
    const line: string[] = [];
    for (let c = b.c0; c <= b.c1; c++) line.push(getRaw(e.sheet, colName(c) + (r + 1)));
    block.push(line);
  }
  const hasHeader = detectHeader(block);
  const { rows, order } = sortRows(block, { col: b.col - b.c0, desc: opts.desc, hasHeader });
  const oldStyles: Record<string, CellStyle | undefined> = {};
  pushUndo(e);
  for (let i = 0; i < rows.length; i++) {
    for (let c = b.c0; c <= b.c1; c++) {
      const k = colName(c) + (b.r0 + i + 1);
      setCell(e.sheet, k, rows[i][c - b.c0]);
      oldStyles[k] = e.styles[colName(c) + (b.r0 + order[i] + 1)];
    }
  }
  // Les styles sont lus depuis l'ancien état: copie avant écriture (oldStyles déjà figé par clé destination).
  for (const [k, st] of Object.entries(oldStyles)) {
    if (st) e.styles[k] = st; else delete e.styles[k];
  }
  return true;
}
