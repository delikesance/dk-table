/** ProseMirror schema of a dk doc: titles, lists, quote, rule, and bold/italic/underline/link marks. */
import { Schema, type MarkSpec, type NodeSpec } from "prosemirror-model";
import { schema as basic } from "prosemirror-schema-basic";
import { addListNodes } from "prosemirror-schema-list";

/** Underline mark (not in the basic schema). */
const underline: MarkSpec = {
  parseDOM: [{ tag: "u" }, { style: "text-decoration=underline" }],
  toDOM: () => ["u", 0],
};

/** Inline live reference to a cell or range (`sheet` = sheet id, `ref` = "B3" / "A3:D4"); drawn by `refView`. */
const cellRef: NodeSpec = {
  inline: true, group: "inline", atom: true, selectable: true,
  attrs: { sheet: {}, ref: {} },
  toDOM: (n) => ["span", { class: "dk-ref", "data-sheet": n.attrs.sheet, "data-ref": n.attrs.ref }, n.attrs.ref],
  parseDOM: [{ tag: "span.dk-ref[data-sheet]", getAttrs: (d) => ({ sheet: (d as HTMLElement).dataset.sheet, ref: (d as HTMLElement).dataset.ref }) }],
};

/** The document schema: text blocks, lists, marks and the `cellRef` live reference. */
export const docSchema = new Schema({
  nodes: addListNodes(basic.spec.nodes, "paragraph block*", "block").addToEnd("cellRef", cellRef),
  marks: { strong: basic.spec.marks.get("strong")!, em: basic.spec.marks.get("em")!, underline, link: basic.spec.marks.get("link")! },
});

export { emptyDoc } from "./emptyDoc";
