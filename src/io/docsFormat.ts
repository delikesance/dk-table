/** Validation of the optional `docs` list of a `.dktable` (rich-text documents, see src/doc). */
import type { DocText } from "./types";
import { DktParseError, isObj } from "./parseError";

/**
 * Validates `docs`: each entry needs a unique id (distinct from the sheet ids in `taken`),
 * a name and a ProseMirror JSON root `{type: "doc"}`. Unknown keys are dropped.
 */
export function checkDocs(v: unknown, taken: ReadonlySet<string>): DocText[] {
  if (!Array.isArray(v)) throw new DktParseError("docs must be an array");
  const ids = new Set(taken);
  return v.map((d, i) => {
    const at = `docs[${i}]`;
    if (!isObj(d)) throw new DktParseError(`${at} must be an object`);
    if (typeof d.id !== "string" || !d.id) throw new DktParseError(`${at}.id must be a non-empty string`);
    if (ids.has(d.id)) throw new DktParseError(`duplicate id "${d.id}" in ${at}`);
    ids.add(d.id);
    if (typeof d.name !== "string") throw new DktParseError(`${at}.name must be a string`);
    const c = d.content;
    if (!isObj(c) || c.type !== "doc") throw new DktParseError(`${at}.content must be a doc node {type: "doc"}`);
    if (c.content !== undefined && !Array.isArray(c.content)) {
      throw new DktParseError(`${at}.content.content must be an array`);
    }
    return { id: d.id, name: d.name, content: c as DocText["content"] };
  });
}
