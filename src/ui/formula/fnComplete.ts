/**
 * Function completion for formulas (pure, no DOM): what to show at a caret position in a raw cell value.
 * - "list": names matching the word being typed after "=", an operator, "(" or ";" (e.g. `=1+SU|`);
 * - "hint": signature of the innermost open call around the caret, with the argument index (e.g. `=ROUND(A1; |`).
 * Used by `fnPopup.ts` for the cell editor and the formula bar.
 */
import type { FnDoc } from "../sidebar/sidebar";

/** Names matching the word from `from` to the caret. */
export interface ListCompletion { kind: "list"; from: number; options: FnDoc[] }
/** Call around the caret: `arg` is the 0-based argument under the caret. */
export interface HintCompletion { kind: "hint"; doc: FnDoc; arg: number }
export type FnCompletion = ListCompletion | HintCompletion | null;

/** Characters after which a function name may start (besides the leading "="). */
const NAME_START = /[=+\-*/^&<>(;,%\s]/;
/** Open call frame: function name ("" for a grouping paren) and argument index. */
interface Frame { name: string; arg: number }

/** Open calls before the caret, or null when the caret is inside a string literal. */
function openCalls(before: string): Frame[] | null {
  const stack: Frame[] = [];
  let quoted = false;
  for (let i = 1; i < before.length; i++) {
    const ch = before[i];
    if (ch === '"') quoted = !quoted; // "" (escaped quote) toggles twice
    else if (quoted) continue;
    else if (ch === "(") stack.push({ name: /[A-Za-z_][A-Za-z0-9_.]*$/.exec(before.slice(0, i))?.[0].toUpperCase() ?? "", arg: 0 });
    else if (ch === ")") stack.pop();
    else if ((ch === ";" || ch === ",") && stack.length) stack[stack.length - 1].arg++;
  }
  return quoted ? null : stack;
}

/** Docs whose name starts with `word` (case-insensitive): exact match first, then alphabetical. */
function matching(docs: FnDoc[], word: string): FnDoc[] {
  const p = word.toUpperCase();
  return docs.filter((d) => d.name.startsWith(p))
    .sort((a, b) => (a.name === p ? -1 : b.name === p ? 1 : a.name.localeCompare(b.name)));
}

/** Completion at `pos` in `text` (a raw cell value) against `docs`; null when nothing applies. */
export function fnCompletion(text: string, pos: number, docs: FnDoc[]): FnCompletion {
  if (!text.startsWith("=") || pos < 1) return null;
  const before = text.slice(0, pos);
  const stack = openCalls(before);
  if (!stack) return null;
  const word = /[A-Za-z_][A-Za-z0-9_.]*$/.exec(before.slice(1))?.[0] ?? "";
  const from = pos - word.length;
  const startOk = from === 1 || NAME_START.test(text[from - 1]);
  if (startOk && (word || pos === 1)) {
    const options = matching(docs, word);
    if (options.length) return { kind: "list", from, options };
  }
  for (let i = stack.length - 1; i >= 0; i--) {
    if (!stack[i].name) continue;
    const doc = docs.find((d) => d.name === stack[i].name);
    return doc ? { kind: "hint", doc, arg: stack[i].arg } : null;
  }
  return null;
}

/** Replace `text[from..to]` with `NAME(` (no second "(" when one follows); returns the new text and caret. */
export function applyFn(text: string, from: number, to: number, name: string): { text: string; caret: number } {
  const rest = text.slice(to);
  const insert = rest.startsWith("(") ? name : name + "(";
  return { text: text.slice(0, from) + insert + rest, caret: from + name.length + 1 };
}

/** Split a doc signature `NAME(a; b)` into its name and argument labels. */
export function signatureParts(signature: string): { name: string; args: string[] } {
  const open = signature.indexOf("(");
  const inner = signature.slice(open + 1, signature.lastIndexOf(")")).trim();
  return { name: signature.slice(0, open), args: inner ? inner.split(";").map((a) => a.trim()) : [] };
}
