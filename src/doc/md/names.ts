/**
 * The editor shows sheet names (`{{@Ventes!B3}}`), the stored text keeps sheet ids (`{{@s1!B3}}`) so a renamed
 * sheet keeps working. These two functions convert chips and block fences from one form to the other.
 */
import { toDisplay, toStored, type SheetName } from "../calcSrc";
import { BLOCK_LANG, calcChip, parseCalc, parseRef, refChip } from "./chip";

const CHIP = /\{\{([@=])((?:(?!\}\})[^\n])*)\}\}/g;
const FENCE = new RegExp("(```" + BLOCK_LANG + "\\n)([^\\n]*)(\\n```)", "g");

/** Apply `ref` / `calc` / `sheetOf` (sheet id or name -> the other form) to every live element of `text`. */
function map(text: string, ref: (s: string) => string, calc: (src: string) => string): string {
  return text
    .replace(CHIP, (m, k: string, body: string) => {
      if (k === "@") { const t = parseRef(body); return t ? refChip({ sheet: ref(t.sheet), ref: t.ref }) : m; }
      const c = parseCalc(body);
      return calcChip(calc(c.src), c.fmt);
    })
    .replace(FENCE, (m, a: string, json: string, z: string) => {
      try {
        const o = JSON.parse(json) as { sheet?: string };
        return typeof o.sheet === "string" ? a + JSON.stringify({ ...o, sheet: ref(o.sheet) }) + z : m;
      } catch { return m; }
    });
}

/** Stored text -> editor text (sheet ids become names; an unknown id stays). */
export function toEditorText(stored: string, sheets: SheetName[]): string {
  return map(stored, (id) => sheets.find((s) => s.id === id)?.name ?? id, (src) => toDisplay(src, sheets));
}

/** Editor text -> stored text (known sheet names become ids; an unknown name stays). */
export function toStoredText(text: string, sheets: SheetName[]): string {
  const lower = (n: string): SheetName | undefined => sheets.find((s) => s.name.toLowerCase() === n.toLowerCase());
  return map(text, (n) => lower(n)?.id ?? n, (src) => toStored(src, sheets));
}
