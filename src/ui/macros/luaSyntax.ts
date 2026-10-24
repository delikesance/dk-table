/**
 * Lua syntax tokenizer for the macro editor (CodeMirror StreamLanguage). Unlike the legacy Lua mode, which
 * lumps almost everything into "variable", it separates keywords, constants, library names (`sheet`, `print`,
 * `string`...), members (`sheet.getValue` -> `getValue`), numbers, strings, comments and operators so the
 * highlighter can give each its own color.
 */
import { HighlightStyle, StreamLanguage, type StreamParser } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { GLOBALS } from "../../macros/luadocs";

const KEYWORDS = new Set(GLOBALS.filter((g) => g.kind === "keyword").map((g) => g.label));
const CONSTANTS = new Set(["nil", "true", "false"]);
const BUILTINS = new Set(GLOBALS.filter((g) => g.kind !== "keyword" && g.kind !== "variable").map((g) => g.label));

/** Per-parse state: depth of an open long bracket (`[==[ ... ]==]`, comment or string), -1 when none. */
interface State { long: number; asComment: boolean; member: boolean }

/** Consume the rest of a long bracket of level `n`; true when it closes on this line. */
function eatLong(stream: Parameters<StreamParser<State>["token"]>[0], n: number): boolean {
  const close = `]${"=".repeat(n)}]`;
  while (!stream.eol()) {
    if (stream.match(close)) return true;
    stream.next();
  }
  return false;
}

const parser: StreamParser<State> = {
  startState: () => ({ long: -1, asComment: false, member: false }),
  token(stream, state) {
    if (state.long >= 0) {
      if (eatLong(stream, state.long)) state.long = -1;
      return state.asComment ? "comment" : "string";
    }
    if (stream.eatSpace()) return null;
    const open = stream.match(/^(--)?\[(=*)\[/) as RegExpMatchArray | null;
    if (open) {
      state.asComment = !!open[1];
      state.long = open[2].length;
      if (eatLong(stream, state.long)) state.long = -1;
      return state.asComment ? "comment" : "string";
    }
    if (stream.match("--")) { stream.skipToEnd(); return "comment"; }
    const quote = stream.match(/^["']/) as RegExpMatchArray | null;
    if (quote) {
      let c: string | void;
      while ((c = stream.next()) !== undefined) {
        if (c === "\\") stream.next();
        else if (c === quote[0]) break;
      }
      return "string";
    }
    if (stream.match(/^(0x[\da-f]+|\d+\.?\d*(e[+-]?\d+)?|\.\d+)/i)) return "number";
    const word = stream.match(/^[A-Za-z_]\w*/) as RegExpMatchArray | null;
    if (word) {
      const w = word[0], member = state.member;
      state.member = false;
      if (member) return "propertyName";
      if (CONSTANTS.has(w)) return "bool";
      if (KEYWORDS.has(w)) return "keyword";
      return BUILTINS.has(w) ? "builtin" : "variableName";
    }
    if (stream.match(/^(\.\.\.?|==|~=|<=|>=|\/\/|<<|>>|[-+*/%^#&~|<>=])/)) return "operator";
    const ch = stream.next();
    state.member = ch === "." || ch === ":";
    return "punctuation";
  },
  copyState: (s) => ({ ...s }),
  languageData: { commentTokens: { line: "--", block: { open: "--[[", close: "]]" } } },
};

/** The Lua language support used by the macro editor. */
export const luaLanguage = StreamLanguage.define({ ...parser, tokenTable: { builtin: tags.standard(tags.variableName) } });

/** Colors per category, read from the `--c-code-*` tokens (deep blue editor background, light hues). */
export const luaHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: "var(--c-code-keyword)", fontWeight: "500" },
  { tag: [tags.bool, tags.number, tags.atom], color: "var(--c-code-constant)" },
  { tag: tags.string, color: "var(--c-code-string)" },
  { tag: tags.standard(tags.variableName), color: "var(--c-code-builtin)" },
  { tag: tags.propertyName, color: "var(--c-code-member)" },
  { tag: [tags.operator, tags.punctuation], color: "var(--c-code-operator)" },
  { tag: tags.comment, color: "var(--c-code-comment)", fontStyle: "italic" },
]);
