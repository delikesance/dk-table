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
  /** Colors already used in the document (most used first); listed under « Couleurs du document » each time the popover opens. */
  docColors?: () => string[];
}

/** Normalised `#rrggbb` (lowercase) of a `#rgb` / `#rrggbb` color, or null. */
export function normalizeHex(c: string): string | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c.trim());
  if (!m) return null;
  const h = m[1].toLowerCase();
  return "#" + (h.length === 3 ? [...h].map((x) => x + x).join("") : h);
}

/** Document colors not already in the palette, deduplicated (case, short hex), in the given order, at most `max`. */
export function extraColors(used: readonly string[], palette: readonly PaletteColor[], max = 20): string[] {
  const known = new Set(palette.map((c) => c.value));
  const out: string[] = [];
  for (const u of used) {
    const n = normalizeHex(u);
    if (n && !known.has(n) && !out.includes(n)) out.push(n);
  }
  return out.slice(0, max);
}

/** Popover element exposing `setCurrent` to mark the active color. */
export type ColorPicker = HTMLElement & { setCurrent(color: string | null): void };

const COLS = 5;

/** Builds the popover (grid of swatches + "Aucune"), appended to `root`. */
export function createColorPicker(opts: ColorPickerOptions): ColorPicker {
  const { kind, onPick, root, docColors } = opts;
  const palette = kind === "fill" ? FILL_COLORS : TEXT_COLORS;
  const pop = document.createElement("div") as unknown as ColorPicker;
  pop.className = "color-picker";
  pop.setAttribute("role", "dialog");
  pop.setAttribute("aria-label", kind === "fill" ? "Couleur de fond" : "Couleur du texte");

  const entries: { color: string | null; name: string }[] = [
    ...palette.map((c) => ({ color: c.value, name: c.name })),
    { color: null, name: "Aucune" },
  ];
  let current: string | null = null;
  /** One swatch button (palette, document color or « Aucune »). */
  const swatch = (color: string | null, name: string): HTMLButtonElement => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = color ? "color-swatch" : "color-swatch color-none";
    b.setAttribute("aria-label", name);
    b.title = name;
    b.dataset.color = color ?? "";
    b.setAttribute("aria-pressed", String(color === current));
    if (color) b.style.background = color;
    b.addEventListener("click", () => onPick(color));
    return b;
  };
  entries.forEach((e) => pop.appendChild(swatch(e.color, e.name)));

  // Custom color: native picker, applied when the dialog is validated (not on every drag step).
  const custom = document.createElement("label");
  custom.className = "color-custom";
  const input = document.createElement("input");
  input.type = "color";
  input.setAttribute("aria-label", "Couleur personnalisée");
  input.value = "#3366cc";
  input.addEventListener("change", () => { const c = normalizeHex(input.value); if (c) onPick(c); });
  custom.append(input, document.createTextNode(" Couleur personnalisée…"));
  pop.appendChild(custom);

  // Colors already used in the document, rebuilt each time the popover opens.
  const doc = document.createElement("div");
  doc.className = "color-doc";
  pop.appendChild(doc);
  const refreshDoc = (): void => {
    const list = docColors ? extraColors(docColors(), palette) : [];
    doc.replaceChildren();
    doc.hidden = list.length === 0;
    if (!list.length) return;
    const title = document.createElement("div");
    title.className = "color-doc__title";
    title.textContent = "Couleurs du document";
    doc.appendChild(title);
    const grid = document.createElement("div");
    grid.className = "color-doc__grid";
    list.forEach((c) => grid.appendChild(swatch(c, c)));
    doc.appendChild(grid);
  };
  refreshDoc();
  new MutationObserver(() => { if (!pop.hidden) refreshDoc(); }).observe(pop, { attributes: true, attributeFilter: ["hidden"] });

  const swatches = (): HTMLButtonElement[] => [...pop.querySelectorAll<HTMLButtonElement>("button.color-swatch")];
  pop.addEventListener("keydown", (ev) => {
    const btns = swatches();
    const i = btns.indexOf(ev.target as HTMLButtonElement);
    if (i < 0) return;
    const step: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: COLS, ArrowUp: -COLS };
    if (ev.key in step) {
      ev.preventDefault();
      const j = Math.min(btns.length - 1, Math.max(0, i + step[ev.key]));
      btns[j].focus();
    } else if (ev.key === "Enter") {
      ev.preventDefault();
      onPick(btns[i].dataset.color || null);
    } else if (ev.key === "Escape") {
      pop.hidden = true;
    }
  });

  pop.setCurrent = (color) => {
    current = color;
    swatches().forEach((b) => b.setAttribute("aria-pressed", String(color === null ? !b.dataset.color : b.dataset.color === color)));
  };
  root.appendChild(pop);
  return pop;
}
