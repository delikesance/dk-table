/** What the live widgets need from the app: the workbook, a calculator, and a counter that forces a redraw. */
import { Facet, StateEffect } from "@codemirror/state";
import type { Calc } from "../calc";
import type { RefBook, RefTarget } from "../refs";
import type { SheetName } from "../calcSrc";

export interface LiveHost {
  book: RefBook;
  /** Follow a reference (click on a chip). */
  open(t: RefTarget): void;
  calc: Calc;
  /** Scratch cell reused by every calculation chip (they are evaluated one after the other). */
  slot: string;
  /** Bumped by `DocEditor.refresh()`; widgets of an older version are redrawn. */
  version: { n: number };
}

/** Host of the editor; null (plain text editor) leaves chips and blocks as source text. */
export const liveHost = Facet.define<LiveHost, LiveHost | null>({ combine: (v) => v[0] ?? null });

/** Effect that makes the decorations be rebuilt (after a recalculation). */
export const refreshFx = StateEffect.define<null>();

/** Sheets of the workbook as `{id, name}`. */
export const sheetsOf = (h: LiveHost): SheetName[] => h.book.sheets().map((s) => ({ id: s.id, name: s.name }));

/** Id of the sheet named `name` (case-insensitive), or `name` itself when there is none. */
export const idOf = (h: LiveHost, name: string): string => sheetsOf(h).find((s) => s.name.toLowerCase() === name.toLowerCase())?.id ?? name;
