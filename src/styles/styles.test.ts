/**
 * Garde-fous lisibilité des CSS de design (tokens.css + theme-dark.css + components.css).
 * - aucune font-size < 12px (littérale ou via --fs-*)
 * - ratio de contraste WCAG >= 4.5 pour les paires texte/fond, thèmes clair et sombre.
 */
import { describe, expect, it } from 'vitest';
// @ts-ignore @types/node absent ; vitest neutralise `?raw` sur les .css, d'où fs.
import { readFileSync } from 'node:fs';

const read = (f: string): string => (readFileSync as (p: string, e: string) => string)(`src/styles/${f}`, 'utf8');
const tokens = read('tokens.css');
const components = read('components.css');

type Rgba = [number, number, number, number];

/** Parse #rrggbb / rgba() en [r,g,b,a]. */
function parse(v: string): Rgba {
  const h = v.trim().match(/^#([0-9a-f]{6})$/i);
  if (h) {
    const n = parseInt(h[1], 16);
    return [n >> 16, (n >> 8) & 255, n & 255, 1];
  }
  const m = v.match(/rgba?\(([^)]+)\)/);
  if (!m) throw new Error(`couleur illisible: ${v}`);
  const p = m[1].split(',').map(Number);
  return [p[0], p[1], p[2], p[3] ?? 1];
}

/** Compose une couleur (alpha) sur un fond opaque. */
function over(fg: Rgba, bg: Rgba): Rgba {
  const a = fg[3];
  return [0, 1, 2].map((i) => fg[i] * a + bg[i] * (1 - a)).concat(1) as Rgba;
}

/** Luminance relative WCAG. */
function lum([r, g, b]: Rgba): number {
  const c = [r, g, b].map((x) => {
    const s = x / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

/** Ratio de contraste WCAG entre deux couleurs opaques. */
function ratio(a: Rgba, b: Rgba): number {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Variables déclarées dans un bloc CSS (commentaires retirés). */
function vars(block: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of block.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(--[\w-]+):\s*([^;]+?);/g)) out[m[1]] = m[2].trim();
  return out;
}

const darkBlock = read('theme-dark.css');
const light = vars(tokens.split('@media')[0]);
const themes: Record<string, Record<string, string>> = {
  clair: light,
  sombre: { ...light, ...vars(darkBlock) },
};

const texts = ['--c-text', '--c-text-2', '--c-text-3', '--c-accent', '--c-error', '--c-success', '--c-dep-in', '--c-dep-out'];
const surfaces = ['--c-bg', '--c-surface', '--c-surface-2', '--c-surface-hover'];

describe('contraste texte/fond >= 4.5', () => {
  for (const [name, t] of Object.entries(themes)) {
    const c = (k: string) => parse(t[k]);
    for (const fg of texts) {
      for (const bg of surfaces) {
        it(`${name}: ${fg} sur ${bg}`, () => {
          expect(ratio(over(c(fg), c(bg)), c(bg))).toBeGreaterThanOrEqual(4.5);
        });
      }
    }
    it(`${name}: texte sur accent`, () => {
      expect(ratio(c('--c-text-on-accent'), c('--c-accent'))).toBeGreaterThanOrEqual(4.5);
    });
    it(`${name}: texte readonly`, () => {
      expect(ratio(c('--c-readonly-text'), c('--c-readonly-bg'))).toBeGreaterThanOrEqual(4.5);
    });
    it(`${name}: erreur sur fond erreur`, () => {
      const bg = over(c('--c-error-soft'), c('--c-surface'));
      expect(ratio(c('--c-error'), bg)).toBeGreaterThanOrEqual(4.5);
    });
    it(`${name}: texte du chrome sur chrome et panneau profond`, () => {
      for (const bg of ['--c-chrome', '--c-chrome-deep']) expect(ratio(c('--c-chrome-text'), c(bg))).toBeGreaterThanOrEqual(4.5);
      expect(ratio(over(c('--c-chrome-text-2'), c('--c-chrome')), c('--c-chrome'))).toBeGreaterThanOrEqual(4.5);
    });
    it(`${name}: texte papier sur fond plein #0000F2`, () => {
      expect(ratio(parse('#f2f2f2'), c('--c-accent-solid'))).toBeGreaterThanOrEqual(4.5);
    });
    it(`${name}: texte des en-têtes de grille sur --c-header`, () => {
      for (const fg of ['--c-text', '--c-text-2', '--c-accent']) expect(ratio(c(fg), c('--c-header'))).toBeGreaterThanOrEqual(4.5);
    });
    it(`${name}: accent sur en-tête sélectionné (teinte sur fond d'en-tête)`, () => {
      const bg = over(c('--c-accent-soft-2'), c('--c-header'));
      expect(ratio(c('--c-accent'), bg)).toBeGreaterThanOrEqual(4.5);
    });
    it(`${name}: accent sur plage sélectionnée`, () => {
      const bg = over(c('--c-accent-soft-2'), c('--c-surface'));
      expect(ratio(c('--c-accent'), bg)).toBeGreaterThanOrEqual(4.5);
    });
  }
});

describe('font-size >= 12px', () => {
  it('tokens --fs-* >= 12px', () => {
    for (const [k, v] of Object.entries(light)) {
      if (k.startsWith('--fs-')) expect(parseFloat(v), k).toBeGreaterThanOrEqual(12);
    }
  });
  it('aucune font-size littérale < 12px', () => {
    for (const css of [tokens, components]) {
      for (const m of css.matchAll(/font-size:\s*([\d.]+)px/g)) expect(parseFloat(m[1])).toBeGreaterThanOrEqual(12);
      for (const m of css.matchAll(/font:[^;]*?\s([\d.]+)px/g)) expect(parseFloat(m[1])).toBeGreaterThanOrEqual(12);
    }
  });
});
