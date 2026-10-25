/**
 * Sous-totaux et total général par groupes (jusqu'à 3 niveaux), pur, sans DOM.
 * `subtotals(rows, spec)` trie les lignes par colonnes de groupe (`groups`, du niveau 0 au plus fin),
 * puis insère après chaque groupe un sous-total (du plus fin au plus large) et un total général.
 * Les colonnes `values` sont agrégées avec `fn` ; le texte et les vides sont ignorés.
 * Usage : `subtotals(table, { groups: [0, 1], values: [3], fn: "SUM" })` ; le plan repliable
 * n'est pas ici (voir docs/sous-totaux.md).
 */
import { addNum, emptyAcc, parseNum, result, type Acc, type AggFn } from "./aggregate";

/** Paramètres : colonnes de groupe (niveau 0 = externe, 1 à 3 colonnes), colonnes de valeurs, fonction. */
export interface SubSpec {
  groups: number[];
  values: number[];
  fn: AggFn;
}

/** Ligne de sortie : donnée d'origine, sous-total d'un niveau (0 = externe), ou total général. */
export type SubRow =
  | { kind: "data"; cells: string[] }
  | { kind: "sub"; level: number; cells: string[] }
  | { kind: "total"; cells: string[] };

/** Ordre des lignes : comparaison des colonnes de groupe dans l'ordre, sans tenir compte de la casse. */
function compareKeys(a: string[], b: string[], groups: number[]): number {
  for (const g of groups) {
    const c = (a[g] ?? "").localeCompare(b[g] ?? "", "fr", { numeric: true });
    if (c) return c;
  }
  return 0;
}

/** Sous-totaux et total général. Plage vide : []. */
export function subtotals(rows: string[][], spec: SubSpec): SubRow[] {
  if (!rows.length) return [];
  const { groups, values, fn } = spec;
  const width = Math.max(
    rows.reduce((w, r) => Math.max(w, r.length), 0),
    ...groups.map((g) => g + 1),
    ...values.map((v) => v + 1),
  );
  const sorted = rows.map((r) => r.slice()).sort((a, b) => compareKeys(a, b, groups));
  const fresh = (): Acc[] => values.map(() => emptyAcc());
  const acc = groups.map(fresh);
  const grand = fresh();
  const out: SubRow[] = [];

  /** Ferme le niveau `lvl` : une ligne de sous-total après le groupe `key`. */
  const close = (lvl: number, key: string[]) => {
    const cells = new Array<string>(width).fill("");
    cells[groups[lvl]] = `Total ${key[groups[lvl]] ?? ""}`;
    values.forEach((c, j) => (cells[c] = result(acc[lvl][j], fn)));
    out.push({ kind: "sub", level: lvl, cells });
    acc[lvl] = fresh();
  };

  /** Ajoute une ligne aux niveaux et au total général. */
  const feed = (accs: Acc[], row: string[]) =>
    values.forEach((c, j) => {
      const n = parseNum(row[c] ?? "");
      if (n !== null) addNum(accs[j], n);
    });

  let prev: string[] | null = null;
  for (const row of sorted) {
    if (prev) {
      // premier niveau dont la clé change : on ferme ce niveau et tous les plus fins
      const first = groups.findIndex((g) => (prev![g] ?? "") !== (row[g] ?? ""));
      if (first >= 0) for (let l = groups.length - 1; l >= first; l--) close(l, prev);
    }
    groups.forEach((_, l) => feed(acc[l], row));
    feed(grand, row);
    out.push({ kind: "data", cells: row });
    prev = row;
  }
  for (let l = groups.length - 1; l >= 0; l--) close(l, prev!);

  const total = new Array<string>(width).fill("");
  total[0] = "Total général";
  values.forEach((c, j) => (total[c] = result(grand[j], fn)));
  out.push({ kind: "total", cells: total });
  return out;
}
