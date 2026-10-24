/** Cell presentation helpers: style application and in-cell live charts. */
import { getRaw, getRangeValues, type Sheet } from "../engine/sheet";
import { liveResult } from "../engine/live/adapter";
import type { CellStyle } from "./model";
import type { CfStyle } from "../engine/cf/types";
import { hexRgb, isDark } from "../engine/cf/scale";

/** Ink kept readable on any fill in both themes (Hermes blue on light fills, paper on dark ones). */
const INK = { light: "#0000f2", dark: "#f2f2f2" } as const;
import "./cellview.css";

const ALIGN = { left: "flex-start", center: "center", right: "flex-end" } as const;

/** Apply `s` to the DOM cell `key` inside `host` (no-op if absent); `cf` = conditional style drawn over it. */
export function paintStyle(host: HTMLElement, key: string, s: CellStyle = {}, cf?: CfStyle): void {
  const el = host.querySelector<HTMLElement>(`.dkg-cell[data-key="${key}"]`);
  if (el) paintCell(el, s, cf);
}

/** Apply the cell style `base`, overridden by the conditional style `cf` (fill, color, bold, italic, data bar). */
export function paintCell(el: HTMLElement, base: CellStyle = {}, cf?: CfStyle): void {
  const { bar, ...over } = cf ?? {};
  const s: CellStyle = { ...base, ...over };
  el.style.fontWeight = s.bold ? "700" : "";
  el.style.fontStyle = s.italic ? "italic" : "";
  el.style.textAlign = s.align ?? "";
  el.style.justifyContent = s.align ? ALIGN[s.align] : ""; // cells are flex: text-align alone is ignored
  el.style.background = s.fill ?? "";
  // a fill without an explicit text color gets a contrasting ink (light theme text is blue, dark theme text is paper)
  el.style.color = s.color ?? (s.fill && hexRgb(s.fill) ? INK[isDark(s.fill) ? "dark" : "light"] : "");
  // data bar: a gradient layer over the fill (the `background` shorthand above resets it)
  if (bar) {
    const tint = `rgba(${(hexRgb(bar.color) ?? [0, 0, 242]).join(", ")}, 0.3)`;
    el.style.backgroundImage = `linear-gradient(90deg, ${tint} ${bar.pct}%, transparent ${bar.pct}%)`;
  }
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
