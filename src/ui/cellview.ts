/** Cell presentation helpers: style application and in-cell live charts. */
import { getRaw, getRangeValues, type Sheet } from "../engine/sheet";
import { liveResult } from "../engine/live/adapter";
import type { CellStyle } from "./model";

/** Apply `s` to the DOM cell `key` inside `host` (no-op if absent). */
export function paintStyle(host: HTMLElement, key: string, s: CellStyle = {}): void {
  const el = host.querySelector<HTMLElement>(`.dkg-cell[data-key="${key}"]`);
  if (!el) return;
  el.style.fontWeight = s.bold ? "700" : "";
  el.style.fontStyle = s.italic ? "italic" : "";
  el.style.textAlign = s.align ?? "";
  el.style.background = s.fill ?? "";
}

/** Grid renderCell hook: live-function html (SPARKLINE/BAR/TREND) or null for plain text. */
export function liveCell(sheet: Sheet, key: string): HTMLElement | null {
  const r = liveResult(getRaw(sheet, key), (rng) => getRangeValues(sheet, rng));
  if (!r) return null;
  const span = document.createElement("span");
  span.className = "dk-live";
  span.innerHTML = r.html;
  return span;
}
