/** Helpers shared by the Markdown and HTML exports (read from the JSON content, no ProseMirror needed). */
import { chartData, readRange, tableView, type BlockAttrs } from "./blocks";
import { resolveRef, type RefBook } from "./refs";
import { trendInfo } from "../engine/live";
import { createCalc, type Calc } from "./calc";

/** Minimal shape of a ProseMirror JSON node. */
export interface JNode { type: string; attrs?: Record<string, unknown>; content?: JNode[]; text?: string; marks?: { type: string; attrs?: Record<string, unknown> }[] }

/** Text of a cell reference chip. */
export const refText = (book: RefBook, n: JNode): string => resolveRef(book, { sheet: String(n.attrs?.sheet), ref: String(n.attrs?.ref) }).text;

/** Rows of a linked block as plain text: `head` (null without header), `body`; null when the target is gone. */
export function blockRows(book: RefBook, a: BlockAttrs): { head: string[] | null; body: string[][] } | null {
  const d = readRange(book, a);
  if (!d) return null;
  if (a.kind === "table") return tableView(d, a);
  const c = chartData(d, a);
  const body = c.labels.map((l, i) => [l, c.valueLabels[i]]);
  if (a.kind === "trend") body.push(["Tendance", trendInfo(c.values).label]);
  return { head: a.header ? [d.rows[0]?.[0] ?? "", c.valueName] : null, body };
}

/** Evaluator of the calculation chips of one export. */
export interface CalcOut { text(n: JNode): string; html(n: JNode): string }

/** Chip values for an export: plain text (a chart gives its trend, or nothing) and HTML (charts stay inline). */
export function calcOut(book: RefBook): CalcOut {
  const calc: Calc = createCalc(book);
  const run = (n: JNode) => calc.eval(calc.slot(), String(n.attrs?.src ?? ""), String(n.attrs?.fmt ?? "auto"));
  return {
    text: (n) => run(n).text,
    html: (n) => { const r = run(n); return r.html ?? r.text; },
  };
}
