/** Cell presentation helpers: style application and in-cell live charts. */
import { getRaw, getRangeValues, type Sheet } from "../engine/sheet";
import { liveResult } from "../engine/live/adapter";
import type { CellStyle } from "./model";
import "./cellview.css";

const ALIGN = { left: "flex-start", center: "center", right: "flex-end" } as const;

/** Apply `s` to the DOM cell `key` inside `host` (no-op if absent). */
export function paintStyle(host: HTMLElement, key: string, s: CellStyle = {}): void {
  const el = host.querySelector<HTMLElement>(`.dkg-cell[data-key="${key}"]`);
  if (!el) return;
  el.style.fontWeight = s.bold ? "700" : "";
  el.style.fontStyle = s.italic ? "italic" : "";
  el.style.textAlign = s.align ?? "";
  el.style.justifyContent = s.align ? ALIGN[s.align] : ""; // cells are flex: text-align alone is ignored
  el.style.background = s.fill ?? "";
  el.style.color = s.color ?? "";
  el.style.textDecoration = s.underline ? "underline" : "";
  el.style.whiteSpace = s.wrap ? "normal" : ""; // grid row height is fixed: overflow stays hidden
  el.classList.toggle("dk-wrap", !!s.wrap);
  const edges = (["t", "r", "b", "l"] as const).filter((e) => s.borders?.[e]).join("");
  if (edges) el.dataset.borders = edges; // drawn by cellview.css (::after), keeps the cursor box-shadow intact
  else el.removeAttribute("data-borders");
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
