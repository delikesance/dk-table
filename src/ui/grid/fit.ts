/**
 * Auto-fit of columns ("Ajuster à la largeur du contenu"): which columns a selection spans and the width
 * that holds their widest displayed text. The measure is injectable: real DOM text width in the app,
 * a per-character estimate where there is no layout (tests).
 */
import { colName, parseKey } from "./keys";
import { clampWidth } from "./colwidth";

/** Estimated glyph width (px), bold factor and inner margin (cell padding + filter button room). */
const CHAR_PX = 7;
const BOLD = 1.1;
const PAD_PX = 20;

/** One displayed text of a column; `bold` when its cell is bold. */
export interface FitText { text: string; bold?: boolean }

/** Columns (0-based, ascending) spanned by a selection "A1" or "A1:C9". */
export function colsOfSelection(sel: string): number[] {
  const [a, b = a] = sel.split(":").map((k) => parseKey(k).col);
  const [lo, hi] = [Math.min(a, b), Math.max(a, b)];
  return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
}

/** Width of column `name` (its header letter counts too) holding every text of `texts`. */
export function fitColumn(name: string, texts: FitText[], measure?: Measure): number {
  const w = (t: FitText): number => measure ? measure(t.text, !!t.bold) : t.text.length * CHAR_PX * (t.bold ? BOLD : 1);
  const widest = [{ text: colName(parseKey(`${name}1`).col) } as FitText, ...texts].reduce((m, t) => Math.max(m, w(t)), 0);
  return clampWidth(Math.ceil(widest) + PAD_PX);
}

/** Measure function type: text width in px. */
export type Measure = (t: string, bold: boolean) => number;

/** Run `fn` with a real text-width measure in the grid font (undefined when the page has no layout, e.g. jsdom). */
export function withDomMeasure<T>(host: HTMLElement, fn: (m: Measure | undefined) => T): T {
  const sample = host.querySelector<HTMLElement>(".dkg-cell");
  const probe = document.createElement("span");
  probe.style.cssText = "position:absolute;visibility:hidden;white-space:pre;left:-9999px";
  if (sample) probe.style.font = getComputedStyle(sample).font;
  host.appendChild(probe);
  probe.textContent = "mmmm";
  const live = probe.getBoundingClientRect().width > 0;
  try {
    return fn(live ? (text, bold) => {
      probe.style.fontWeight = bold ? "700" : "";
      probe.textContent = text;
      return probe.getBoundingClientRect().width;
    } : undefined);
  } finally { probe.remove(); }
}
