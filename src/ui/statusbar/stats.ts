/** Pure selection statistics for the status bar (no DOM). */
import type { Value } from "../../engine/types";

/** Figures of a selection; numeric ones are absent when it holds no number. */
export interface SelStats { count: number; numCount: number; sum?: number; avg?: number; min?: number; max?: number }

/** Compute stats over cell values: non-empty cells are counted, only real numbers feed sum/avg/min/max. */
export function selectionStats(values: Value[]): SelStats {
  const nums = values.filter((v): v is number => typeof v === "number");
  const count = values.filter((v) => v !== "").length;
  if (!nums.length) return { count, numCount: 0 };
  const sum = nums.reduce((a, b) => a + b, 0);
  return { count, numCount: nums.length, sum, avg: sum / nums.length, min: Math.min(...nums), max: Math.max(...nums) };
}

const fmt = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 10 });

/** All selectable entries, in display order. */
export const STAT_LABELS = ["Moyenne", "Nb", "Nb numérique", "Min", "Max", "Somme"];

/** Labelled figures to display, in order; empty unless at least 2 cells are selected; `enabled` limits the labels. */
export function statItems(cells: number, values: Value[], enabled: string[] = STAT_LABELS): { label: string; value: string }[] {
  if (cells < 2) return [];
  const s = selectionStats(values);
  const out: { label: string; value: string }[] = [];
  if (s.numCount) out.push({ label: "Moyenne", value: fmt(s.avg!) });
  out.push({ label: "Nb", value: fmt(s.count) });
  if (s.numCount) out.push({ label: "Nb numérique", value: fmt(s.numCount) }, { label: "Min", value: fmt(s.min!) },
    { label: "Max", value: fmt(s.max!) }, { label: "Somme", value: fmt(s.sum!) });
  return out.filter((i) => enabled.includes(i.label));
}
