/** Typing `=` at the start of a word (or paragraph) opens an empty calculation chip in edit mode. */
import type { EditorView } from "prosemirror-view";
import { docSchema } from "./schema";

/** `handleTextInput` prop: true when the `=` was turned into a chip. A `=` glued to a word stays a normal character. */
export function handleEquals(view: EditorView, from: number, to: number, text: string): boolean {
  if (text !== "=") return false;
  const $f = view.state.doc.resolve(from);
  if (!$f.parent.inlineContent || $f.parent.type.spec.code) return false;
  const before = $f.parent.textBetween(Math.max(0, $f.parentOffset - 1), $f.parentOffset, undefined, "￼");
  if (before !== "" && !/\s/.test(before)) return false;
  view.dispatch(view.state.tr.replaceWith(from, to, docSchema.nodes.calc.create({ src: "", fmt: "auto" })));
  return true;
}
