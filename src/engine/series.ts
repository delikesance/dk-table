/**
 * Recopie intelligente (poignée de recopie): prolonge une ligne de valeurs brutes comme Excel / Sheets.
 * Reconnaît, dans l'ordre: nombres (pas constant, sinon tendance linéaire), dates texte, mois/jours FR,
 * texte terminé par un nombre ("Item 1"); sinon le motif source est répété. Pur, sans DOM.
 * La source est donnée dans le sens de la recopie (pour remonter, l'appelant la renverse).
 * `lists` = listes personnalisées (`io/customLists.ts`), prolongées de façon cyclique.
 */
import { isDecimal } from "./values";
import { dateSeries } from "./series-date";
import { nameSeries } from "./series-names";

/** Une série reconnue: `next(i)` = valeur n°i après la source; `byDefault` = prolongée sans Ctrl pour une source d'un seul élément. */
interface Kind { next(i: number): string; byDefault: boolean }

/** Nombre -> texte brut, sans bruit flottant. */
const show = (v: number): string => String(Number(v.toFixed(12)));

/** Nombres: pas constant, sinon droite des moindres carrés (comme la tendance d'Excel). */
function numberSeries(src: string[], dir: number): Kind | null {
  if (!src.every((s) => isDecimal(s) && Number.isFinite(Number(s)))) return null;
  const y = src.map(Number), n = y.length, last = y[n - 1];
  if (n === 1) return { byDefault: false, next: (i) => show(last + dir * (i + 1)) };
  const step = y[1] - y[0];
  if (y.every((v, k) => k === 0 || Math.abs(v - y[k - 1] - step) < 1e-9)) return { byDefault: true, next: (i) => show(last + step * (i + 1)) };
  const xm = (n - 1) / 2, ym = y.reduce((a, b) => a + b, 0) / n;
  const slope = y.reduce((a, v, k) => a + (k - xm) * (v - ym), 0) / y.reduce((a, _, k) => a + (k - xm) ** 2, 0);
  return { byDefault: true, next: (i) => show(ym + slope * (n + i - xm)) };
}

/** Texte + nombre final ("Item 1"): même préfixe partout, pas constant (1 pour une seule valeur), zéros de tête gardés. */
function suffixSeries(src: string[], dir: number): Kind | null {
  const m = src.map((s) => /^(.*?)(\d+)$/.exec(s));
  if (m.some((x) => !x) || new Set(m.map((x) => x![1])).size !== 1) return null;
  const nums = m.map((x) => Number(x![2]));
  const step = nums.length === 1 ? dir : nums[1] - nums[0];
  if (nums.some((v, k) => k > 0 && v - nums[k - 1] !== step)) return null;
  const width = m.some((x) => x![2].length > 1 && x![2][0] === "0") ? Math.max(...m.map((x) => x![2].length)) : 0;
  const last = nums[nums.length - 1];
  return { byDefault: true, next: (i) => m[0]![1] + String(Math.max(0, last + step * (i + 1))).padStart(width, "0") };
}

/**
 * Valeurs des `n` cellules qui suivent `src`. `ctrl` inverse le comportement: un seul nombre devient une
 * série +1, une seule date / un seul "Item 1" est recopié, plusieurs valeurs sont recopiées en boucle.
 * `dir` -1: recopie vers le haut / la gauche; une source d'un seul élément décroît (lundi -> dimanche).
 */
export function extendSeries(src: string[], n: number, ctrl = false, dir: 1 | -1 = 1, lists: readonly (readonly string[])[] = []): string[] {
  if (n <= 0 || !src.length) return [];
  const copy = (i: number): string => src[i % src.length];
  const kind = src.some((s) => s.trim() === "") ? null : numberSeries(src, dir) ?? dateSeries(src, dir) ?? nameSeries(src, dir, lists) ?? suffixSeries(src, dir);
  const series = !!kind && (ctrl ? src.length === 1 && !kind.byDefault : kind.byDefault);
  return Array.from({ length: n }, (_, i) => (series ? kind!.next(i) : copy(i)));
}
