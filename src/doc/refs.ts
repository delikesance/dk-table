/** Live references of a dk doc: resolve a target to its displayed text, and search targets by names. */
import { getDisplay, getRaw, type Sheet } from "../engine/sheet";
import { formatValue } from "../ui/numfmt";
import { parseKey } from "../ui/grid/keys";

/** What a reference points to: a sheet (by stable id) and a cell ("B3") or range ("A3:D4"). */
export interface RefTarget { sheet: string; ref: string }

/** The workbook as the documents see it (read only). */
export interface RefBook {
  sheets(): { id: string; name: string; sheet: Sheet; styles: Record<string, { format?: string }>; merges?: string[] }[];
}

/** Result of {@link resolveRef}. */
export interface ResolvedRef {
  /** Text shown in the document (formatted value, range summary, or "#REF!"). */
  text: string;
  /** "Feuille!B3" (current sheet name), or the bare ref when the sheet is gone. */
  address: string;
  /** True when the target no longer exists. */
  error?: boolean;
  /** Raw content of a single cell (formula or constant), "" for a range or a missing target. */
  raw?: string;
}

/** Result of {@link searchRefs}: one candidate cell. */
export interface RefHit { label: string; address: string; text: string; target: RefTarget }

/** Resolve `t` against the workbook; never throws. */
export function resolveRef(book: RefBook, t: RefTarget): ResolvedRef {
  const s = book.sheets().find((x) => x.id === t.sheet);
  if (!s) return { text: "#REF!", address: t.ref, error: true };
  const address = `${s.name}!${t.ref}`;
  const [a, b] = t.ref.split(":");
  if (b) {
    try {
      const p = parseKey(a), q = parseKey(b);
      return { text: `${address} · ${Math.abs(q.row - p.row) + 1} × ${Math.abs(q.col - p.col) + 1}`, address };
    } catch { return { text: "#REF!", address, error: true }; }
  }
  return { text: formatValue(getDisplay(s.sheet, a), s.styles[a]?.format), address, raw: getRaw(s.sheet, a) };
}

/** Column letters of a cell key ("C12" -> "C"). */
const colOf = (key: string): string => key.replace(/\d+$/, "");

/**
 * Cells matching `query`, best first. Each word must appear in the cell's names ("row label · column label"),
 * its value or its address; "bob ca" finds « Bob · CA_T1 ». At most `limit` hits.
 */
export function searchRefs(book: RefBook, query: string, limit = 8): RefHit[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const hits: { hit: RefHit; score: number }[] = [];
  for (const s of book.sheets()) {
    for (const key of Object.keys(s.sheet.cells)) {
      const text = formatValue(getDisplay(s.sheet, key), s.styles[key]?.format);
      if (text === "") continue;
      const row = Number(key.replace(/^[A-Z]+/, ""));
      const colLabel = getDisplay(s.sheet, `${colOf(key)}1`);
      const rowLabel = getDisplay(s.sheet, `A${row}`);
      const named = row > 1 && colOf(key) !== "A" && colLabel !== "" && rowLabel !== "";
      const label = named ? `${rowLabel} · ${colLabel}` : `${s.name} · ${key}`;
      const address = `${s.name}!${key}`;
      const hay = `${label} ${text} ${address}`.toLowerCase();
      if (!words.every((w) => hay.includes(w))) continue;
      const score = (named ? 0 : 2) + (label.toLowerCase().startsWith(words[0]) ? 0 : 1);
      hits.push({ hit: { label, address, text, target: { sheet: s.id, ref: key } }, score });
    }
  }
  return hits.sort((x, y) => x.score - y.score || x.hit.address.localeCompare(y.hit.address)).slice(0, limit).map((h) => h.hit);
}

/** The last range copied in a sheet: its TSV text, sheet id and range ("B3" or "A3:D4"). */
export interface CopyInfo { text: string; sheet: string; ref: string }
