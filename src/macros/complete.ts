/** Editor-agnostic Lua completion: what to propose at a cursor position (used by the CodeMirror adapter). */
import { DOCS, GLOBALS, type Doc } from "./luadocs";

/** Completion result: replace text from `from` to the cursor with one of `options`. */
export interface Completion {
  from: number;
  options: Doc[];
}

/** True when `line` (text before the cursor on its line) ends inside a string or a comment. */
function inStringOrComment(line: string): boolean {
  let quote = "";
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) {
      if (c === "\\") i++;
      else if (c === quote) quote = "";
    } else if (c === '"' || c === "'") quote = c;
    else if (c === "-" && line[i + 1] === "-") return true;
  }
  return quote !== "";
}

/** Names declared in the code: locals, functions, loop variables and parameters. */
function declaredNames(text: string): Doc[] {
  const names = new Set<string>();
  const add = (list: string) => list.split(",").map((s) => s.trim()).filter((s) => /^[A-Za-z_]\w*$/.test(s)).forEach((s) => names.add(s));
  for (const m of text.matchAll(/\blocal\s+(?!function\b)([\w\s,]+?)(?==|\n|$)/g)) add(m[1]);
  for (const m of text.matchAll(/\bfunction\s+([A-Za-z_]\w*)?\s*\(([^)]*)\)/g)) { if (m[1]) add(m[1]); add(m[2]); }
  for (const m of text.matchAll(/\bfor\s+([\w\s,]+?)\s*(?:=|\bin\b)/g)) add(m[1]);
  return [...names].map((label) => ({ label, kind: "variable", detail: label, ret: "", info: "" }));
}

/** Keep entries whose label starts with `prefix` (case-insensitive), without duplicates. */
function filter(list: Doc[], prefix: string): Doc[] {
  const p = prefix.toLowerCase(), seen = new Set<string>();
  return list.filter((d) => d.label.toLowerCase().startsWith(p) && !seen.has(d.label) && seen.add(d.label));
}

/**
 * Completions at `pos` in `text`. Member access (`ns.` / `ns:`) lists that namespace;
 * otherwise globals, keywords and declared names. Returns null when nothing applies
 * (inside a string/comment, unknown namespace, or no prefix while not `explicit`).
 */
export function complete(text: string, pos: number, explicit: boolean): Completion | null {
  const before = text.slice(0, pos);
  if (inStringOrComment(before.slice(before.lastIndexOf("\n") + 1))) return null;
  const member = /([A-Za-z_]\w*)[.:]([A-Za-z_]\w*)?$/.exec(before);
  if (member) {
    const docs = DOCS[member[1]];
    if (!docs) return null;
    const prefix = member[2] ?? "";
    const options = filter(docs, prefix);
    return options.length ? { from: pos - prefix.length, options } : null;
  }
  const word = /[A-Za-z_]\w*$/.exec(before)?.[0] ?? "";
  if (!word && !explicit) return null;
  const rest = text.slice(0, pos - word.length) + text.slice(pos);
  const options = filter([...declaredNames(rest), ...GLOBALS], word);
  return options.length ? { from: pos - word.length, options } : null;
}
