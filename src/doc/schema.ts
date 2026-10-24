/** ProseMirror schema of a dk doc: titles, lists, quote, rule, and bold/italic/underline/link marks. */
import { Schema, type MarkSpec } from "prosemirror-model";
import { schema as basic } from "prosemirror-schema-basic";
import { addListNodes } from "prosemirror-schema-list";

/** Underline mark (not in the basic schema). */
const underline: MarkSpec = {
  parseDOM: [{ tag: "u" }, { style: "text-decoration=underline" }],
  toDOM: () => ["u", 0],
};

/** The document schema (extended later by the live-reference nodes, see refs). */
export const docSchema = new Schema({
  nodes: addListNodes(basic.spec.nodes, "paragraph block*", "block"),
  marks: { strong: basic.spec.marks.get("strong")!, em: basic.spec.marks.get("em")!, underline, link: basic.spec.marks.get("link")! },
});

export { emptyDoc } from "./emptyDoc";
