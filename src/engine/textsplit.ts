/**
 * « Texte en colonnes » (Données) : découpe le texte d'une colonne selon des délimiteurs.
 * Module pur, sans DOM. Les guillemets doubles protègent les délimiteurs (`"a,b",c` -> `a,b` | `c`).
 */
import { parseKey } from "./address";
import { colToLetters } from "./range";

/** Options de découpe. */
export interface SplitOpts {
  /** Délimiteurs d'un caractère (",", ";", "\t", " "). */
  delims: string[];
  /** Délimiteur « autre » (un ou plusieurs caractères, ex. "|"). */
  other?: string;
  /** Traite les délimiteurs consécutifs comme un seul. */
  merge?: boolean;
}

/** Découpe une ligne en parties (au moins une). */
export function splitLine(text: string, o: SplitOpts): string[] {
  const seps = [...o.delims, ...(o.other ? [o.other] : [])].filter((s) => s !== "");
  if (!seps.length) return [text];
  const out: string[] = [];
  let cur = "", quoted = false, i = 0, atSep = false;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '"') { quoted = !quoted; i++; atSep = false; continue; }
    const sep = quoted ? undefined : seps.find((s) => text.startsWith(s, i));
    if (sep) {
      if (!(o.merge && atSep)) out.push(cur);
      cur = ""; atSep = true; i += sep.length;
    } else { cur += ch; i++; atSep = false; }
  }
  out.push(cur);
  return out;
}

/**
 * Découpe chaque cellule (clé A1 -> texte brut) vers la droite, la 1re partie restant dans sa colonne.
 * Retourne les cellules à écrire et le nombre max de parties (colonnes occupées).
 */
export function splitColumn(src: Record<string, string>, o: SplitOpts): { cells: Record<string, string>; cols: number } {
  const cells: Record<string, string> = {};
  let cols = 0;
  for (const [key, raw] of Object.entries(src)) {
    const p = parseKey(key);
    if (!p || raw === "") continue;
    const parts = splitLine(raw, o);
    cols = Math.max(cols, parts.length);
    parts.forEach((v, i) => { cells[colToLetters(p.col + i) + p.row] = v; });
  }
  return { cells, cols };
}
