/**
 * Import CSV « texte d'abord » : les valeurs que le tableur convertirait à tort (zéros de tête, SEPT2 -> date,
 * IBAN, nombres de 16 chiffres et plus, 1E5, 1/2) restent du texte (apostrophe de forçage). Un rapport par colonne
 * liste les conversions évitées; une colonne refusée est importée telle qu'écrite (conversion acceptée).
 * Usage : `importTextFirst(texte, { refuse: ["A"] })` -> `{ sheet, columns }`.
 */
import { fromCsv, type CsvSheet, type Delimiter } from "./csv";
import { parseKey } from "../engine/address";
import { colToLetters } from "../engine/range";

/** Motifs risqués : [regex, motif affiché]. */
const RULES: [RegExp, string][] = [
  [/^0\d+$/, "zéros de tête perdus"],
  [/^[A-Z]{2}\d{2}[A-Z0-9 ]{11,30}$/, "IBAN / identifiant long"],
  [/^\d{16,}$/, "plus de 15 chiffres (précision perdue)"],
  [/^(jan|fe[bv]|fév|mar|apr|avr|may|mai|jun|jui|aug|ao[uû]|sep|oct|nov|dec|déc)[a-zéû]*[ -]?\d{1,2}$/i, "ressemble à une date (SEPT2)"],
  [/^\d+e[+-]?\d+$/i, "notation scientifique"],
  [/^\d{1,2}[/-]\d{1,2}$/, "fraction ou date"],
];

/** Motif de risque d'une valeur, ou null si elle peut être convertie sans danger. */
export function riskOf(v: string): string | null {
  const t = v.trim();
  return RULES.find(([re]) => re.test(t))?.[1] ?? null;
}

/** Rapport d'une colonne : conversions évitées (ou acceptées si `refused`). */
export interface ColumnReport { col: string; header: string; count: number; reasons: string[]; examples: string[]; refused: boolean }
/** Résultat de l'import. */
export interface TextImport { sheet: CsvSheet; columns: ColumnReport[] }
/** Options : séparateur imposé, colonnes (lettres) dont la conversion est acceptée. */
export interface TextImportOpts { delimiter?: Delimiter; refuse?: string[] }

/** Importe un CSV en gardant en texte les valeurs risquées; `columns` = rapport par colonne touchée. */
export function importTextFirst(text: string, opts: TextImportOpts = {}): TextImport {
  const sheet = fromCsv(text, opts.delimiter);
  const refuse = new Set(opts.refuse ?? []);
  const rep = new Map<string, ColumnReport>();
  for (const [key, cell] of Object.entries(sheet.cells)) {
    const p = parseKey(key);
    if (!p || cell.raw.startsWith("'")) continue;
    const why = riskOf(cell.raw);
    if (!why) continue;
    const col = colToLetters(p.col);
    let r = rep.get(col);
    if (!r) rep.set(col, r = { col, header: sheet.cells[`${col}1`]?.raw ?? "", count: 0, reasons: [], examples: [], refused: refuse.has(col) });
    r.count++;
    if (!r.reasons.includes(why)) r.reasons.push(why);
    if (r.examples.length < 3) r.examples.push(cell.raw);
    if (!r.refused) cell.raw = `'${cell.raw}`;
  }
  return { sheet, columns: [...rep.values()].sort((a, b) => a.col.length - b.col.length || (a.col < b.col ? -1 : 1)) };
}
