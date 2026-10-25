/**
 * Serialization of the sheet outline (rows and columns) to plain JSON and back, pure.
 * `outlineFromJson` validates everything (levels 0 to MAX_LEVEL, fold rows inside the axis,
 * fold depth 1 to MAX_LEVEL + 1) and throws RangeError on bad input, so a corrupted file never
 * yields a broken outline. Usage: store `outlineToJson(s)`, restore with `outlineFromJson(raw, rows, cols)`.
 */
import { MAX_LEVEL, type Fold, type Outline } from "./outline";
import type { SheetOutline } from "./outlineState";

/** Plain JSON shape of one axis. */
interface AxisJson {
  levels: number[];
  collapsed: Fold[];
}

/** Plain JSON shape of the sheet outline. */
export interface OutlineJson {
  rows: AxisJson;
  cols: AxisJson;
}

/** Convert the outline to plain JSON (copies, no shared references). */
export function outlineToJson(s: SheetOutline): OutlineJson {
  return { rows: axisToJson(s.rows), cols: axisToJson(s.cols) };
}

/** Restore an outline from JSON for a sheet of `rows` rows and `cols` columns. Throws RangeError if invalid. */
export function outlineFromJson(raw: unknown, rows: number, cols: number): SheetOutline {
  const o = asRecord(raw, "plan");
  return { rows: axisFromJson(o.rows, rows, "lignes"), cols: axisFromJson(o.cols, cols, "colonnes") };
}

/** Copy of one axis as plain JSON. */
function axisToJson(o: Outline): AxisJson {
  return { levels: o.levels.slice(), collapsed: o.collapsed.map((f) => ({ row: f.row, depth: f.depth })) };
}

/** Validate and copy one axis of `n` entries. */
function axisFromJson(raw: unknown, n: number, label: string): Outline {
  const o = asRecord(raw, label);
  if (!Array.isArray(o.levels) || o.levels.length !== n) throw new RangeError(`plan ${label} : ${n} niveaux attendus`);
  const levels = o.levels.map((level) => {
    if (!Number.isInteger(level) || level < 0 || level > MAX_LEVEL) {
      throw new RangeError(`plan ${label} : niveau ${String(level)} hors de 0-${MAX_LEVEL}`);
    }
    return level as number;
  });
  if (!Array.isArray(o.collapsed)) throw new RangeError(`plan ${label} : replis attendus`);
  const collapsed = o.collapsed.map((f: unknown): Fold => {
    const fold = asRecord(f, `${label} (pli)`);
    const { row, depth } = fold;
    if (!Number.isInteger(row) || (row as number) < 0 || (row as number) >= n) {
      throw new RangeError(`plan ${label} : pli sur l'index ${String(row)} absent`);
    }
    if (!Number.isInteger(depth) || (depth as number) < 1 || (depth as number) > MAX_LEVEL + 1) {
      throw new RangeError(`plan ${label} : profondeur ${String(depth)} invalide`);
    }
    return { row: row as number, depth: depth as number };
  });
  return { levels, collapsed };
}

/** Narrow `raw` to an object, else throw RangeError naming `label`. */
function asRecord(raw: unknown, label: string): Record<string, unknown> {
  if (typeof raw !== "object" || raw === null) throw new RangeError(`plan ${label} : objet attendu`);
  return raw as Record<string, unknown>;
}
