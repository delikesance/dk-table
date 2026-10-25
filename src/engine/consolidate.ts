/**
 * Consolidation de plusieurs plages (feuilles) : agrège les cellules de même position,
 * ou de mêmes étiquettes (ligne du haut / colonne de gauche). Pur, sans DOM.
 * Les textes et vides sont ignorés ; une cellule sans nombre contributeur donne "".
 * Usage: consolidate([{ name, grid }, ...], { fn: "SUM", topRow: true, leftCol: true }).
 */
import { AggFn, Acc, addNum, emptyAcc, parseNum, result } from "./aggregate";

/** Une source : grille de texte (lignes x colonnes), telle qu'affichée dans la feuille. */
export interface ConsolidateSource {
  name: string;
  grid: string[][];
}

/** Options : fonction d'agrégat et présence d'étiquettes (ligne du haut, colonne de gauche). */
export interface ConsolidateOptions {
  fn: AggFn;
  topRow?: boolean;
  leftCol?: boolean;
}

/** Axe de sortie : clés dans l'ordre de première apparition et texte affiché de chaque clé. */
class Axis {
  readonly keys: string[] = [];
  readonly text = new Map<string, string>();

  /** Enregistre la clé une seule fois (ordre de première apparition). */
  add(key: string, text: string): void {
    if (this.text.has(key)) return;
    this.keys.push(key);
    this.text.set(key, text);
  }
}

/** Clé d'une étiquette (espaces retirés), ou null si l'étiquette est vide. */
function labelKey(raw: string | undefined): { key: string; text: string } | null {
  const text = (raw ?? "").trim();
  return text ? { key: `L:${text}`, text } : null;
}

/** Largeur maximale d'une grille (lignes possiblement inégales). */
function width(grid: string[][]): number {
  let w = 0;
  for (const row of grid) w = Math.max(w, row.length);
  return w;
}

/**
 * Consolide les sources. Sortie : grille de texte. Avec `topRow`, la première ligne est
 * la ligne d'en-tête ; avec `leftCol`, la première colonne porte les étiquettes de lignes.
 */
export function consolidate(sources: ConsolidateSource[], opts: ConsolidateOptions): string[][] {
  const top = !!opts.topRow;
  const left = !!opts.leftCol;
  const rows = new Axis();
  const cols = new Axis();
  const accs = new Map<string, Map<string, Acc>>();

  for (const { grid } of sources) {
    const h = top ? 1 : 0;
    const l = left ? 1 : 0;
    const colKeys: ({ key: string; text: string } | null)[] = [];
    for (let c = l; c < width(grid); c++) {
      const spec = top ? labelKey(grid[0]?.[c]) : { key: `P:${c - l}`, text: "" };
      colKeys[c] = spec;
      if (spec) cols.add(spec.key, spec.text);
    }
    for (let r = h; r < grid.length; r++) {
      const row = grid[r] ?? [];
      const rowSpec = left ? labelKey(row[0]) : { key: `P:${r - h}`, text: "" };
      if (!rowSpec) continue;
      rows.add(rowSpec.key, rowSpec.text);
      for (let c = l; c < row.length; c++) {
        const colSpec = colKeys[c];
        const x = parseNum(row[c] ?? "");
        if (!colSpec || x === null) continue;
        addNum(cell(accs, rowSpec.key, colSpec.key), x);
      }
    }
  }

  return render(rows, cols, accs, opts.fn, top, left);
}

/** Accumulateur d'une cellule de sortie, créé à la demande. */
function cell(accs: Map<string, Map<string, Acc>>, rk: string, ck: string): Acc {
  let byRow = accs.get(rk);
  if (!byRow) accs.set(rk, (byRow = new Map()));
  let acc = byRow.get(ck);
  if (!acc) byRow.set(ck, (acc = emptyAcc()));
  return acc;
}

/** Grille de sortie : en-tête (si étiquettes du haut), puis une ligne par clé d'axe. */
function render(
  rows: Axis,
  cols: Axis,
  accs: Map<string, Map<string, Acc>>,
  fn: AggFn,
  top: boolean,
  left: boolean,
): string[][] {
  const out: string[][] = [];
  if (top) {
    out.push([...(left ? [""] : []), ...cols.keys.map((k) => cols.text.get(k) ?? "")]);
  }
  for (const rk of rows.keys) {
    const line = left ? [rows.text.get(rk) ?? ""] : [];
    for (const ck of cols.keys) {
      const acc = accs.get(rk)?.get(ck);
      line.push(acc ? result(acc, fn) : "");
    }
    out.push(line);
  }
  return out;
}
