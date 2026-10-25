/** Séries de dates écrites en texte (AAAA-MM-JJ ou JJ/MM/AAAA): jours, mois, années, jours ouvrés. */

const DAY = 86_400_000;
const pad = (n: number, w = 2): string => String(n).padStart(w, "0");

/** Date lue + format d'écriture à restituer. */
interface Parsed { t: number; iso: boolean }

/** Texte -> date UTC (ms) si c'est une date calendaire valide. */
function parse(s: string): Parsed | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  const fr = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s.trim());
  const [y, m, d] = iso ? [+iso[1], +iso[2], +iso[3]] : fr ? [+fr[3], +fr[2], +fr[1]] : [0, 0, 0];
  if (!iso && !fr) return null;
  const t = Date.UTC(y, m - 1, d);
  const dt = new Date(t);
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d ? { t, iso: !!iso } : null;
}

/** Date UTC (ms) -> texte dans le format voulu. */
function fmt(t: number, iso: boolean): string {
  const d = new Date(t);
  const [y, m, dd] = [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()];
  return iso ? `${pad(y, 4)}-${pad(m)}-${pad(dd)}` : `${pad(dd)}/${pad(m)}/${pad(y, 4)}`;
}

/** Ajoute `k` mois à `t` en gardant le jour `day`, ramené au dernier jour du mois si besoin. */
function addMonths(t: number, k: number, day: number): number {
  const d = new Date(t);
  const first = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + k, 1);
  const len = new Date(Date.UTC(new Date(first).getUTCFullYear(), new Date(first).getUTCMonth() + 1, 0)).getUTCDate();
  return first + (Math.min(day, len) - 1) * DAY;
}

/** Jour ouvré suivant (`sign` 1) ou précédent (-1). */
function stepWeekday(t: number, sign: number): number {
  let n = t + sign * DAY;
  while ([0, 6].includes(new Date(n).getUTCDay())) n += sign * DAY;
  return n;
}

/**
 * Série de dates: une seule -> +1 jour; même jour du mois et écart de mois constant -> mois (années = 12 mois);
 * sinon écart de jours constant; vendredi->lundi présent dans des jours ouvrés -> jours ouvrés.
 * Null si ce ne sont pas toutes des dates ou si aucun pas régulier n'existe.
 */
export function dateSeries(src: string[], dir = 1): { next(i: number): string; byDefault: boolean } | null {
  const ds = src.map(parse);
  if (ds.some((d) => !d)) return null;
  const ts = (ds as Parsed[]).map((d) => d.t);
  const iso = (ds as Parsed[])[0].iso;
  const last = ts[ts.length - 1];
  const out = (f: (i: number) => number) => ({ byDefault: true, next: (i: number) => fmt(f(i), iso) });
  if (ts.length === 1) return out((i) => last + dir * (i + 1) * DAY);
  const days = ts.slice(1).map((t, k) => Math.round((t - ts[k]) / DAY));
  const mi = (t: number): number => new Date(t).getUTCFullYear() * 12 + new Date(t).getUTCMonth();
  const months = ts.slice(1).map((t, k) => mi(t) - mi(ts[k]));
  const day = new Date(ts[0]).getUTCDate();
  const sameDay = ts.every((t) => new Date(t).getUTCDate() === day) ||
    ts.every((t) => new Date(t + DAY).getUTCDate() === 1); // fins de mois
  if (months[0] !== 0 && months.every((m) => m === months[0]) && sameDay) {
    const anchorDay = ts.every((t) => new Date(t).getUTCDate() === day) ? day : 31;
    return out((i) => addMonths(last, months[0] * (i + 1), anchorDay));
  }
  const sign = Math.sign(days[0]);
  const wd = ts.every((t) => ![0, 6].includes(new Date(t).getUTCDay()));
  const okGap = (g: number, t: number): boolean =>
    g === sign || (Math.abs(g) === 3 && new Date(t).getUTCDay() === (sign > 0 ? 5 : 1));
  if (wd && days.some((g) => Math.abs(g) === 3) && days.every((g, k) => okGap(g, ts[k]))) {
    return out((i) => { let t = last; for (let k = 0; k <= i; k++) t = stepWeekday(t, sign); return t; });
  }
  if (days.every((g) => g === days[0])) return out((i) => last + days[0] * (i + 1) * DAY);
  return null;
}
