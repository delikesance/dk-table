/**
 * Freeze entries in Google Sheets wording ("Figer jusqu'à la ligne 5" / "jusqu'à la colonne C"), shared by
 * the Affichage menu and the header context menu: freezing one axis keeps the other, release is per axis.
 */
import { colName, parseKey } from "../grid/keys";
import type { App } from "../appTypes";

/** A menu entry. */
export interface FreezeEntry { label: string; run(): void }

/**
 * Rows/cols to freeze for "jusqu'à" the selection `sel` of a `cols` x `rows` sheet: up to its last row and
 * column, inclusive; an axis the selection spans entirely (header selection) counts its first line only.
 */
export function freezeUpTo(sel: string, cols: number, rows: number): { rows: number; cols: number } {
  const [a, b = a] = sel.split(":").map(parseKey);
  const whole = (lo: number, hi: number, n: number) => lo === 0 && hi === n - 1;
  return {
    rows: (whole(a.row, b.row, rows) ? a.row : b.row) + 1,
    cols: (whole(a.col, b.col, cols) ? a.col : b.col) + 1,
  };
}

/** Freeze entries for `axis` ("both": both "jusqu'à" entries, no per-axis release) on the selection of `app`. */
export function freezeEntries(app: App, axis: "rows" | "cols" | "both"): FreezeEntry[] {
  const { cols, rows } = app.activeDoc();
  const up = freezeUpTo(app.selection(), cols, rows);
  const f = app.getFreeze();
  const out: FreezeEntry[] = [];
  if (axis !== "cols") out.push({ label: `Figer jusqu'à la ligne ${up.rows}`, run: () => app.setFreeze({ rows: up.rows, cols: f.cols }) });
  if (axis !== "rows") out.push({ label: `Figer jusqu'à la colonne ${colName(up.cols - 1)}`, run: () => app.setFreeze({ rows: f.rows, cols: up.cols }) });
  if (axis === "rows" && f.rows) out.push({ label: "Libérer les lignes", run: () => app.setFreeze({ rows: 0, cols: f.cols }) });
  if (axis === "cols" && f.cols) out.push({ label: "Libérer les colonnes", run: () => app.setFreeze({ rows: f.rows, cols: 0 }) });
  return out;
}
