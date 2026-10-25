/** Completion lists of the dk doc editor: `@` finds cells of the workbook, function names inside a `{{=…}}` chip. */
import { autocompletion, type CompletionContext, type CompletionResult } from "@codemirror/autocomplete";
import { EditorSelection, type Extension } from "@codemirror/state";
import { FN_DOCS } from "../../ui/fndocs";
import { toDisplay } from "../calcSrc";
import { refChip } from "../md/chip";
import { searchRefs } from "../refs";
import { liveHost, sheetsOf, type LiveHost } from "./host";

/** Offset of the `{{=` that is still open at the end of `before`, or -1. */
const calcOpen = (before: string): number => {
  const i = before.lastIndexOf("{{=");
  return i >= 0 && !before.slice(i).includes("}}") ? i : -1;
};
const AT = /@([^@\n{}]{1,40})$/;

/** `@words`: matching cells; inside a calc chip the address is inserted, elsewhere a reference chip. */
function atSource(host: LiveHost) {
  return (ctx: CompletionContext): CompletionResult | null => {
    const line = ctx.state.doc.lineAt(ctx.pos), before = line.text.slice(0, ctx.pos - line.from);
    const m = AT.exec(before);
    const hits = m ? searchRefs(host.book, m[1]) : [];
    if (!m || !hits.length) return null;
    const inCalc = calcOpen(before) >= 0, sheets = sheetsOf(host);
    return {
      from: ctx.pos - m[0].length, filter: false,
      options: hits.map((h) => ({
        label: h.label, detail: `${h.address} · ${h.text}`,
        apply: (view, _c, from, to) => {
          const text = inCalc ? toDisplay(`{${h.target.sheet}}!${h.target.ref}`, sheets) : refChip({ sheet: sheets.find((s) => s.id === h.target.sheet)?.name ?? h.target.sheet, ref: h.target.ref });
          view.dispatch({ changes: { from, to, insert: text }, selection: EditorSelection.cursor(from + text.length), userEvent: "input.complete" });
        },
      })),
    };
  };
}

/** Function names while a word is typed inside a calc chip. */
function fnSource(ctx: CompletionContext): CompletionResult | null {
  const line = ctx.state.doc.lineAt(ctx.pos), before = line.text.slice(0, ctx.pos - line.from);
  const w = /[A-Za-z_][A-Za-z0-9_.]*$/.exec(before);
  if (!w || calcOpen(before) < 0 || /@[^@\n{}()+\-*/^&<>=;,"]*$/.test(before)) return null;
  const up = w[0].toUpperCase(), docs = FN_DOCS.filter((d) => d.name.startsWith(up)).sort((a, b) => a.name.localeCompare(b.name));
  if (!docs.length) return null;
  return { from: ctx.pos - w[0].length, filter: false, options: docs.map((d) => ({ label: d.name, detail: d.description, apply: `${d.name}(` })) };
}

/** Completion extension; without a host (plain text) there is nothing to propose. */
export function docCompletion(host: LiveHost | null): Extension {
  return host ? [liveHost.of(host), autocompletion({ override: [atSource(host), fnSource], icons: false, interactionDelay: 0 })] : [];
}
