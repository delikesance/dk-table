/**
 * Formula text of a document chip, in three forms: typed/displayed (sheet names: `Synthese!B3`),
 * stored (sheet ids: `{s1}!B3`, so a renamed sheet keeps working) and engine (quoted current name).
 * String literals are never touched.
 */

/** A sheet as far as formula text is concerned. */
export interface SheetName { id: string; name: string }

/** `'Nom cité'!` or `Nom!`, capturing the bare name. */
const NAMED = /'((?:[^']|'')+)'!|([A-Za-zÀ-ÿ_][\wÀ-ÿ.]*)!/g;
const ID = /\{([^}]+)\}!/g;

/** Apply `f` to the parts of `src` outside double-quoted strings. */
function outside(src: string, f: (part: string) => string): string {
  return src.split(/("(?:[^"]|"")*")/).map((p, i) => (i % 2 ? p : f(p))).join("");
}

const quote = (n: string): string => `'${n.replace(/'/g, "''")}'`;
const needsQuote = (n: string): boolean => !/^[A-Za-zÀ-ÿ_][\wÀ-ÿ.]*$/.test(n);

/** Typed text -> stored text: known sheet names become ids. */
export function toStored(text: string, sheets: SheetName[]): string {
  return outside(text, (p) => p.replace(NAMED, (m, q: string | undefined, b: string | undefined) => {
    const name = (q !== undefined ? q.replace(/''/g, "'") : b!).toLowerCase();
    const s = sheets.find((x) => x.name.toLowerCase() === name);
    return s ? `{${s.id}}!` : m;
  }));
}

/** Stored text -> the same text with `name(id)` produced by `f`; unknown ids give `'?'`. */
function expand(stored: string, sheets: SheetName[], f: (name: string) => string): string {
  return outside(stored, (p) => p.replace(ID, (_m, id: string) => {
    const s = sheets.find((x) => x.id === id);
    return `${s ? f(s.name) : "'?'"}!`;
  }));
}

/** Stored text -> text for the engine (current sheet names, always quoted). */
export const toEngine = (stored: string, sheets: SheetName[]): string => expand(stored, sheets, quote);

/** Stored text -> text shown while editing (current names, quoted only when needed). */
export const toDisplay = (stored: string, sheets: SheetName[]): string => expand(stored, sheets, (n) => (needsQuote(n) ? quote(n) : n));

/** The cell a formula consists of alone (`{s1}!B3`), or null. */
export function singleRef(stored: string): { sheet: string; ref: string } | null {
  const m = /^\s*\{([^}]+)\}!\$?([A-Za-z]+)\$?(\d+)\s*$/.exec(stored);
  return m ? { sheet: m[1], ref: `${m[2].toUpperCase()}${m[3]}` } : null;
}

/** A whole-formula live chart: `BAR({s1}!B2:B4)` or `SPARKLINE({s1}!B2:B)` -> name, sheet id, range (no `$`). */
export function liveCall(stored: string): { fn: "SPARKLINE" | "BAR" | "TREND"; sheet: string; range: string } | null {
  const e = "(\\$?[A-Za-z]*\\$?\\d*)";
  const m = new RegExp(`^\\s*(SPARKLINE|BAR|TREND)\\s*\\(\\s*\\{([^}]+)\\}!${e}(?::${e})?\\s*\\)\\s*$`, "i").exec(stored);
  if (!m || !m[3] || (m[4] !== undefined && !m[4])) return null;
  const range = [m[3], m[4]].filter(Boolean).join(":").replace(/\$/g, "").toUpperCase();
  return { fn: m[1].toUpperCase() as "BAR", sheet: m[2], range };
}
