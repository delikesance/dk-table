/**
 * FEC export (Fichier des Écritures Comptables, art. A47 A-1 du LPF), pure.
 * The sheet's row 1 names the 18 FEC columns (any order, any case, extra columns ignored);
 * each non-empty row below is one line. Formulas export their computed values.
 * Usage: `const r = toFec(app.activeDoc()); if ("text" in r) write(r.text); else show(r.errors)`.
 */
import { createSheet, getDisplay, getValue, setCell, type Sheet, type Value } from "../engine/sheet";
import { isErr } from "../engine/types";
import { fecAmount, fecCents, fecDate, fecText } from "./fecfields";
import type { DocSheet } from "./types";

/** The 18 FEC columns, in the legal output order. */
export const FEC_COLUMNS = [
  "JournalCode", "JournalLib", "EcritureNum", "EcritureDate", "CompteNum", "CompteLib",
  "CompAuxNum", "CompAuxLib", "PieceRef", "PieceDate", "EcritureLib", "Debit", "Credit",
  "EcritureLet", "DateLet", "ValidDate", "Montantdevise", "Idevise",
] as const;

/** One FEC column name. */
export type FecColumn = (typeof FEC_COLUMNS)[number];

const DATES = new Set<FecColumn>(["EcritureDate", "PieceDate", "DateLet", "ValidDate"]);
const AMOUNTS = new Set<FecColumn>(["Debit", "Credit", "Montantdevise"]);
const REQUIRED = new Set<FecColumn>(["JournalCode", "EcritureNum", "EcritureDate", "CompteNum", "ValidDate"]);

/** Result of `toFec`: the file text, or French validation messages. */
export type FecResult = { text: string } | { errors: string[] };

/** Cells A1..R1 holding the 18 FEC column names (for "Insérer les en-têtes FEC"). */
export function fecHeaderCells(): Record<string, { raw: string }> {
  return Object.fromEntries(FEC_COLUMNS.map((c, i) => [`${String.fromCharCode(65 + i)}1`, { raw: c }]));
}

/** Standalone engine sheet computing `doc`'s formulas (same approach as the CSV export). */
function engineSheet(doc: DocSheet): Sheet {
  const s = createSheet();
  s.cols = Math.max(doc.cols, 26);
  s.rows = Math.max(doc.rows, 100);
  for (const [k, c] of Object.entries(doc.cells)) setCell(s, k, c.raw);
  return s;
}

/** FEC column -> column letters, from the header row (first occurrence wins). */
function mapHeader(doc: DocSheet): Map<FecColumn, string> {
  const byName = new Map<string, FecColumn>(FEC_COLUMNS.map((c) => [c.toLowerCase(), c]));
  const found = new Map<FecColumn, string>();
  const keys = Object.keys(doc.cells).filter((k) => /^[A-Z]+1$/.test(k)).sort((a, b) => a.length - b.length || (a < b ? -1 : 1));
  for (const k of keys) {
    const c = byName.get(doc.cells[k].raw.trim().toLowerCase());
    if (c && !found.has(c)) found.set(c, k.slice(0, -1));
  }
  return found;
}

/** Last row number holding a cell (1 when only the header). */
function lastRow(doc: DocSheet): number {
  return Object.keys(doc.cells).reduce((m, k) => Math.max(m, Number(/\d+$/.exec(k)?.[0] ?? 0)), 1);
}

/** One converted row: `fields` in FEC order, its EcritureNum and amounts (cents), and its errors. */
interface RowOut { fields: string[]; num: string; debit: number; credit: number; errors: string[] }

/** Reads and converts row `r` (null when all its FEC cells are empty). */
function readRow(doc: DocSheet, eng: Sheet, cols: Map<FecColumn, string>, r: number): RowOut | null {
  const keyOf = (c: FecColumn) => `${cols.get(c)}${r}`;
  if (FEC_COLUMNS.every((c) => (doc.cells[keyOf(c)]?.raw ?? "") === "")) return null;
  const out: RowOut = { fields: [], num: "", debit: 0, credit: 0, errors: [] };
  const bad = (c: FecColumn, why: string) => { out.errors.push(`Ligne ${r} : ${c} ${why}`); return ""; };
  for (const c of FEC_COLUMNS) {
    const raw = doc.cells[keyOf(c)]?.raw ?? "";
    const v: Value = getValue(eng, keyOf(c));
    out.fields.push(isErr(v) ? bad(c, `en erreur (${v.error})`) : field(c, raw, v, eng, keyOf(c), out, bad));
  }
  return out;
}

/** Converts one cell of column `c`; records amounts and EcritureNum on `out`, errors through `bad`. */
function field(c: FecColumn, raw: string, v: Value, eng: Sheet, key: string, out: RowOut,
  bad: (c: FecColumn, why: string) => string): string {
  if (raw === "") return REQUIRED.has(c) ? bad(c, "manquant") : AMOUNTS.has(c) && c !== "Montantdevise" ? "0,00" : "";
  if (DATES.has(c)) return fecDate(v) ?? bad(c, "invalide");
  if (AMOUNTS.has(c)) {
    const cents = fecCents(v);
    if (cents === null) return bad(c, "invalide");
    if (c === "Debit") out.debit = cents;
    if (c === "Credit") out.credit = cents;
    return fecAmount(cents);
  }
  const text = fecText(raw.startsWith("=") ? getDisplay(eng, key) : raw.replace(/^'/, ""));
  if (c === "EcritureNum") out.num = text;
  return text === "" && REQUIRED.has(c) ? bad(c, "manquant") : text;
}

/** Validates the active sheet and builds the FEC text (header + rows, TAB-separated, CRLF). */
export function toFec(doc: DocSheet): FecResult {
  const cols = mapHeader(doc);
  const missing = FEC_COLUMNS.filter((c) => !cols.has(c));
  if (missing.length) return { errors: [`Colonnes manquantes : ${missing.join(", ")}`] };
  const eng = engineSheet(doc);
  const lines: string[] = [FEC_COLUMNS.join("\t")];
  const errors: string[] = [];
  const totals = new Map<string, { d: number; c: number }>();
  for (let r = 2; r <= lastRow(doc); r++) {
    const row = readRow(doc, eng, cols, r);
    if (!row) continue;
    if (row.debit !== 0 && row.credit !== 0) row.errors.push(`Ligne ${r} : Debit et Credit renseignés`);
    errors.push(...row.errors);
    lines.push(row.fields.join("\t"));
    if (!row.num) continue;
    const t = totals.get(row.num) ?? { d: 0, c: 0 };
    totals.set(row.num, { d: t.d + row.debit, c: t.c + row.credit });
  }
  for (const [num, t] of totals) {
    if (t.d !== t.c) errors.push(`Écriture ${num} déséquilibrée : débit ${fecAmount(t.d)}, crédit ${fecAmount(t.c)}`);
  }
  if (lines.length === 1 && !errors.length) errors.push("Aucune écriture");
  return errors.length ? { errors } : { text: lines.join("\r\n") + "\r\n" };
}
