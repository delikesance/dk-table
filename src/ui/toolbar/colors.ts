/**
 * Color picker for cell fill / text colors: fixed sober palette (10 swatches
 * + "Aucune"), WCAG contrast helper, keyboard-navigable popover.
 */
import "./colors.css";

/** A named palette entry (FR name used as aria-label). */
export interface PaletteColor {
  name: string;
  value: string;
}

/** Soft pastel fills; the default ink (#1d1d1f) stays >= 4.5:1 on each. */
export const FILL_COLORS: readonly PaletteColor[] = [
  { name: "Rouge clair", value: "#fde2e0" },
  { name: "Orange clair", value: "#fde6d0" },
  { name: "Jaune clair", value: "#fdf3c4" },
  { name: "Vert clair", value: "#d9f2dd" },
  { name: "Turquoise clair", value: "#d3f0ee" },
  { name: "Bleu clair", value: "#d6e6fb" },
  { name: "Indigo clair", value: "#e0dcfb" },
  { name: "Violet clair", value: "#f1dcf5" },
  { name: "Rose clair", value: "#fbdbe8" },
  { name: "Gris clair", value: "#e6e6ea" },
];

/** Dark text colors, each >= 4.5:1 on white and on every FILL_COLORS entry. */
export const TEXT_COLORS: readonly PaletteColor[] = [
  { name: "Encre", value: "#1d1d1f" },
  { name: "Gris", value: "#4a4a52" },
  { name: "Rouge", value: "#a8201a" },
  { name: "Orange", value: "#8f3d06" },
  { name: "Ocre", value: "#6b5200" },
  { name: "Vert", value: "#14683a" },
  { name: "Turquoise", value: "#0b5e73" },
  { name: "Bleu", value: "#2a3bb0" },
  { name: "Violet", value: "#6a2fb0" },
  { name: "Rose", value: "#a8104f" },
];

/** WCAG relative luminance of a `#rrggbb` color. */
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio (1..21) between two `#rrggbb` colors. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Options of {@link createColorPicker}. */
export interface ColorPickerOptions {
  kind: "fill" | "text";
  /** Called with the chosen color, or null for "Aucune". */
  onPick: (color: string | null) => void;
  /** Element the popover is appended to. */
  root: HTMLElement;
}

/** Popover element exposing `setCurrent` to mark the active color. */
export type ColorPicker = HTMLElement & { setCurrent(color: string | null): void };

const COLS = 5;

/** Builds the popover (grid of swatches + "Aucune"), appended to `root`. */
export function createColorPicker(opts: ColorPickerOptions): ColorPicker {
  const { kind, onPick, root } = opts;
  const palette = kind === "fill" ? FILL_COLORS : TEXT_COLORS;
  const pop = document.createElement("div") as unknown as ColorPicker;
  pop.className = "color-picker";
  pop.setAttribute("role", "dialog");
  pop.setAttribute("aria-label", kind === "fill" ? "Couleur de fond" : "Couleur du texte");

  const entries: { color: string | null; name: string }[] = [
    ...palette.map((c) => ({ color: c.value, name: c.name })),
    { color: null, name: "Aucune" },
  ];
  const btns = entries.map((e) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = e.color ? "color-swatch" : "color-swatch color-none";
    b.setAttribute("aria-label", e.name);
    b.title = e.name;
    b.setAttribute("aria-pressed", "false");
    if (e.color) b.style.background = e.color;
    b.addEventListener("click", () => onPick(e.color));
    pop.appendChild(b);
    return b;
  });

  pop.addEventListener("keydown", (ev) => {
    const i = btns.indexOf(ev.target as HTMLButtonElement);
    if (i < 0) return;
    const step: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: COLS, ArrowUp: -COLS };
    if (ev.key in step) {
      ev.preventDefault();
      const j = Math.min(btns.length - 1, Math.max(0, i + step[ev.key]));
      btns[j].focus();
    } else if (ev.key === "Enter") {
      ev.preventDefault();
      onPick(entries[i].color);
    } else if (ev.key === "Escape") {
      pop.hidden = true;
    }
  });

  pop.setCurrent = (color) => {
    btns.forEach((b, i) => {
      const cur = color === null ? entries[i].color === null : entries[i].color === color;
      b.setAttribute("aria-pressed", String(cur));
    });
  };
  root.appendChild(pop);
  return pop;
}
