/**
 * Markdown parser of dk doc: Lezer Markdown plus the inline `Chip` element `{{@Feuille!B3}}` / `{{=formule|format}}`.
 * Without it `*` and `_` inside a formula (`{{=A1*B1 + C1*D1}}`) would be read as emphasis marks.
 * Shared by the editor (decorations) and by the conversions to JSON.
 */
import { parser, type MarkdownConfig } from "@lezer/markdown";

/** Inline element: `{{` + `@` or `=` + text without newline or `}}` + `}}`. */
export const chipConfig: MarkdownConfig = {
  defineNodes: [{ name: "Chip" }],
  parseInline: [{
    name: "Chip",
    before: "Emphasis",
    parse(cx, next, pos) {
      if (next !== 123 || cx.char(pos + 1) !== 123) return -1;
      const kind = cx.char(pos + 2);
      if (kind !== 64 && kind !== 61) return -1; // "@" or "="
      const rest = cx.slice(pos, cx.end), end = rest.indexOf("}}");
      if (end < 0 || rest.slice(0, end).includes("\n")) return -1;
      return cx.addElement(cx.elt("Chip", pos, pos + end + 2));
    },
  }],
};

/** The configured Lezer parser. */
export const mdParser = parser.configure(chipConfig);
