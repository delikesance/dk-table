/** Text syntax of the live elements of a dk doc: `{{@Sheet!B3}}` (reference), `{{=formula|format}}` (calculation), ```dkblock fence (linked block). */
import type { BlockAttrs } from "../blocks";
import type { RefTarget } from "../refs";

/** Language tag of the fence that holds a linked block. */
export const BLOCK_LANG = "dkblock";

/** `{{@Sheet!B3}}`; `sheet` is an id in the stored text, a name in the editor text. */
export const refChip = (t: RefTarget): string => `{{@${t.sheet}!${t.ref}}}`;

/** Target of the body of a reference chip (text after `{{@`, before `}}`), or null. */
export function parseRef(body: string): RefTarget | null {
  const i = body.lastIndexOf("!");
  return i > 0 && i < body.length - 1 ? { sheet: body.slice(0, i), ref: body.slice(i + 1) } : null;
}

/** `{{=formula}}` or `{{=formula|format}}` (format omitted when "auto"). */
export const calcChip = (src: string, fmt: string): string => `{{=${src}${fmt && fmt !== "auto" ? `|${fmt}` : ""}}}`;

/** Formula and format of the body of a calculation chip (text after `{{=`, before `}}`). */
export function parseCalc(body: string): { src: string; fmt: string } {
  const m = /^(.*)\|([A-Za-z][\w-]*)$/.exec(body);
  return m ? { src: m[1], fmt: m[2] } : { src: body, fmt: "auto" };
}

/** Kind and body of a whole chip `{{@…}}` / `{{=…}}`, or null. */
export function splitChip(chip: string): { kind: "ref" | "calc"; body: string } | null {
  const m = /^\{\{([@=])([\s\S]*)\}\}$/.exec(chip);
  return m ? { kind: m[1] === "@" ? "ref" : "calc", body: m[2] } : null;
}

/** Fence of a linked block: one JSON line. */
export const blockFence = (a: BlockAttrs): string => "```" + BLOCK_LANG + "\n" + JSON.stringify(a) + "\n```";

/** Attributes of the JSON line of a block fence, or null when it is not a valid block. */
export function parseBlock(json: string): BlockAttrs | null {
  try {
    const o = JSON.parse(json) as Partial<BlockAttrs>;
    if (typeof o.sheet !== "string" || typeof o.ref !== "string") return null;
    const kind = o.kind === "bar" || o.kind === "trend" ? o.kind : "table";
    return { sheet: o.sheet, ref: o.ref, kind, header: o.header !== false, cols: Array.isArray(o.cols) ? o.cols : null, value: typeof o.value === "number" ? o.value : null };
  } catch { return null; }
}

/** A fresh global regex matching whole chips (`{{@…}}`, `{{=…}}`) inside one line. */
export const chipRe = (): RegExp => /\{\{[@=](?:(?!\}\})[^\n])*\}\}/g;

/** The chip of line `text` that the offset range `[a, b]` (line-relative) touches, or null; `strict` = cursor strictly inside. */
export function chipAround(text: string, at: number, strict: boolean): { from: number; to: number } | null {
  for (const m of text.matchAll(chipRe())) {
    const from = m.index!, to = from + m[0].length;
    if (strict ? at > from && at < to : at >= from && at <= to) return { from, to };
  }
  return null;
}
