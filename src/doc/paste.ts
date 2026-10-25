/** Paste of a range copied in the grid: becomes a live link (inline chip for one cell, linked block otherwise). */
import type { EditorView } from "prosemirror-view";
import type { BlockAttrs } from "./blocks";
import type { CopyInfo } from "./refs";

/** True (paste handled) when `text` is exactly the last grid copy; plain text paste otherwise. */
export function pasteLink(view: EditorView, text: string, copy: CopyInfo | null | undefined): boolean {
  if (!copy || !text || copy.text !== text) return false;
  const n = view.state.schema.nodes;
  const attrs = { sheet: copy.sheet, ref: copy.ref };
  const node = copy.ref.includes(":") ? n.liveBlock.create({ ...attrs, kind: "table", header: true, cols: null, value: null }) : n.cellRef.create(attrs);
  view.dispatch(view.state.tr.replaceSelectionWith(node).scrollIntoView());
  return true;
}

/** After the block at `pos`: a paragraph holding a range chip ("cite") or a new linked block ("block") of `a.ref`. */
export function insertAfterBlock(view: EditorView, pos: number, kind: "cite" | "block", a: BlockAttrs): void {
  const n = view.state.schema.nodes, at = pos + view.state.doc.nodeAt(pos)!.nodeSize;
  const node = kind === "block" ? n.liveBlock.create({ ...a }) : n.paragraph.create(null, n.cellRef.create({ sheet: a.sheet, ref: a.ref }));
  view.dispatch(view.state.tr.insert(at, node));
}
