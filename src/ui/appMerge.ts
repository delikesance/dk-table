/** Merge / unmerge the selected cells of the active sheet (App API backend): one undo step each. */
import { getRaw, setCell } from "../engine/sheet";
import { keyOf } from "./grid/keys";
import { absorbedKeys, addMerge, isMulti, parseRect, removeMerges, type Rect } from "./grid/merges";
import { paintKey, touch } from "./appGrid";
import { pushUndo, type Entry } from "./model";
import type { Ctx } from "./appState";
import { showToast } from "./toast/toast";

/** Largest merge accepted (a whole-column selection would otherwise erase the sheet). */
export const MAX_MERGE_CELLS = 10_000;

const rectCache = new WeakMap<string[], Rect[]>();
/** Parsed merges of a sheet (cached per merges array: the array is replaced, never mutated, on change). */
export function mergeRects(e: Entry): Rect[] {
  let r = rectCache.get(e.merges);
  if (!r) rectCache.set(e.merges, (r = e.merges.map(parseRect)));
  return r;
}

/** Merge the selection into its top-left cell; the other cells are emptied (a toast says how many values were lost). */
export function mergeCells(c: Ctx): void {
  const r = parseRect(c.grid.getSelection());
  if (!isMulti(r)) return;
  if ((r.c1 - r.c0 + 1) * (r.r1 - r.r0 + 1) > MAX_MERGE_CELLS) {
    showToast({ message: `Fusion refusée : plus de ${MAX_MERGE_CELLS} cellules`, duration: 5000 });
    return;
  }
  const gone = absorbedKeys(r);
  const lost = gone.filter((k) => getRaw(c.cur.sheet, k) !== "").length;
  pushUndo(c.cur);
  for (const k of gone) { if (getRaw(c.cur.sheet, k) !== "") setCell(c.cur.sheet, k, ""); delete c.cur.styles[k]; }
  c.cur.merges = addMerge(c.cur.merges, r);
  touch(c);
  gone.forEach((k) => paintKey(c, k));
  c.grid.select(keyOf(r.c0, r.r0));
  if (lost) showToast({ message: `${lost} valeur${lost > 1 ? "s" : ""} supprimée${lost > 1 ? "s" : ""} par la fusion (Ctrl+Z pour annuler)`, duration: 6000 });
}

/** True when the selection touches a merged range. */
export function selectionMerged(c: Ctx): boolean {
  const r = parseRect(c.grid.getSelection()), rects = mergeRects(c.cur);
  return rects.some((m) => m.c0 <= r.c1 && r.c0 <= m.c1 && m.r0 <= r.r1 && r.r0 <= m.r1);
}

/** Unmerge every merge touching the selection (cells keep their place; the anchor keeps its value). */
export function unmergeCells(c: Ctx): void {
  if (!selectionMerged(c)) return;
  const sel = c.grid.getSelection(), r = parseRect(sel);
  pushUndo(c.cur);
  c.cur.merges = removeMerges(c.cur.merges, r);
  touch(c);
  c.grid.select(sel);
}
