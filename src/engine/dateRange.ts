/**
 * Utilitaires de plage de dates partagés (pur, sans DOM).
 * Dates lues en texte: ISO `AAAA-MM-JJ` ou `JJ/MM/AAAA`, toujours rendues en ISO.
 * Sert à la sélection des colonnes date d'un tableau, aux bornes min/max et à la liste des jours d'un mois
 * (vues calendrier et chronologie).
 */

/** Bornes d'une plage de dates, en ISO `AAAA-MM-JJ`. */
export interface DateRange {
  min: string;
  max: string;
}

const pad = (n: number, w = 2): string => String(n).padStart(w, "0");

/** Texte -> date ISO si c'est une date calendaire valide, sinon null. */
export function parseDate(text: string): string | null {
  const s = text.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  const fr = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (!iso && !fr) return null;
  const [y, m, d] = iso ? [+iso[1], +iso[2], +iso[3]] : [+fr![3], +fr![2], +fr![1]];
  const back = new Date(Date.UTC(y, m - 1, d));
  const valid = back.getUTCFullYear() === y && back.getUTCMonth() === m - 1 && back.getUTCDate() === d;
  return valid ? `${pad(y, 4)}-${pad(m)}-${pad(d)}` : null;
}

/**
 * Indices des colonnes date d'un tableau (ligne 0 = en-têtes, ignorée).
 * Une colonne est « date » si plus de la moitié de ses valeurs non vides sont des dates valides.
 */
export function dateColumns(table: string[][]): number[] {
  const body = table.slice(1);
  const width = Math.max(0, ...table.map((r) => r.length));
  const cols: number[] = [];
  for (let c = 0; c < width; c++) {
    const filled = body.map((r) => (r[c] ?? "").trim()).filter((v) => v !== "");
    const dates = filled.filter((v) => parseDate(v) !== null).length;
    if (dates > 0 && dates * 2 > filled.length) cols.push(c);
  }
  return cols;
}

/** Min et max des dates valides d'une liste (vides et invalides ignorés); null s'il n'y en a aucune. */
export function dateRange(values: string[]): DateRange | null {
  const iso = values.map(parseDate).filter((d): d is string => d !== null).sort();
  return iso.length ? { min: iso[0], max: iso[iso.length - 1] } : null;
}

/** Tous les jours d'un mois (1-12) au format ISO; liste vide si le mois est hors plage. */
export function daysOfMonth(year: number, month: number): string[] {
  if (!Number.isInteger(month) || month < 1 || month > 12) return [];
  const len = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Array.from({ length: len }, (_, i) => `${pad(year, 4)}-${pad(month)}-${pad(i + 1)}`);
}
