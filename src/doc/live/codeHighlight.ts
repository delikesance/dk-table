/** Syntax colouring of fenced code blocks: per-language parsers loaded on demand, sober classes (`dk-t-*`). */
import { syntaxHighlighting } from "@codemirror/language";
import { languages } from "@codemirror/language-data";
import { tagHighlighter, tags as t } from "@lezer/highlight";

/** Code languages known to the Markdown parser (loaded when a fence names one). */
export const codeLanguages = languages;

/** Only code tags are mapped, so Markdown text itself keeps the document style. */
const highlighter = tagHighlighter([
  { tag: [t.keyword, t.operatorKeyword, t.controlKeyword, t.definitionKeyword, t.moduleKeyword], class: "dk-t-kw" },
  { tag: [t.string, t.special(t.string), t.regexp], class: "dk-t-str" },
  { tag: [t.number, t.bool, t.null, t.atom], class: "dk-t-num" },
  { tag: [t.comment, t.lineComment, t.blockComment], class: "dk-t-com" },
  { tag: [t.typeName, t.className, t.tagName], class: "dk-t-type" },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.definition(t.variableName)], class: "dk-t-fn" },
]);

/** Extension applying the colours. */
export const codeHighlighting = syntaxHighlighting(highlighter);
