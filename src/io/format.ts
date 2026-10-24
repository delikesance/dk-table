/** `.dktable` JSON format: pure serialize / strict parse with clear errors. */
import { FORMAT_VERSION, type DktDoc, type DocMacro, type DocSheet } from "./types";

/** Thrown by `parse` when the text is not a valid `.dktable` document. */
export class DktParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DktParseError";
  }
}

const REF = /^[A-Z]+[1-9]\d*$/;

/** True for plain (non-array, non-null) objects. */
function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** True for integers >= 1. */
function isDim(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 1;
}

/** Validates one sheet entry, throwing a located DktParseError. */
function checkSheet(s: unknown, i: number): DocSheet {
  const at = `sheets[${i}]`;
  if (!isObj(s)) throw new DktParseError(`${at} must be an object`);
  if (typeof s.id !== "string" || !s.id) throw new DktParseError(`${at}.id must be a non-empty string`);
  if (typeof s.name !== "string") throw new DktParseError(`${at}.name must be a string`);
  if (!isDim(s.cols)) throw new DktParseError(`${at}.cols must be an integer >= 1`);
  if (!isDim(s.rows)) throw new DktParseError(`${at}.rows must be an integer >= 1`);
  if (!isObj(s.cells)) throw new DktParseError(`${at}.cells must be an object`);
  const cells: DocSheet["cells"] = {};
  for (const [ref, c] of Object.entries(s.cells)) {
    if (!REF.test(ref)) throw new DktParseError(`${at}.cells: invalid cell reference "${ref}"`);
    if (!isObj(c) || typeof c.raw !== "string") {
      throw new DktParseError(`${at}.cells.${ref}.raw must be a string`);
    }
    cells[ref] = { raw: c.raw };
  }
  return { id: s.id, name: s.name, cols: s.cols, rows: s.rows, cells };
}

/** Validates the optional macros list, throwing a located DktParseError. */
function checkMacros(v: unknown): DocMacro[] {
  if (!Array.isArray(v)) throw new DktParseError("macros must be an array");
  return v.map((m, i) => {
    const at = `macros[${i}]`;
    if (!isObj(m)) throw new DktParseError(`${at} must be an object`);
    if (typeof m.id !== "string" || !m.id) throw new DktParseError(`${at}.id must be a non-empty string`);
    if (typeof m.name !== "string") throw new DktParseError(`${at}.name must be a string`);
    if (typeof m.code !== "string") throw new DktParseError(`${at}.code must be a string`);
    return { id: m.id, name: m.name, code: m.code };
  });
}

/** Serializes a document to pretty JSON text. */
export function serialize(doc: DktDoc): string {
  return JSON.stringify(doc, null, 2);
}

/** Parses and strictly validates `.dktable` text; throws DktParseError. */
export function parse(text: string): DktDoc {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new DktParseError(`Invalid JSON: ${(e as Error).message}`);
  }
  if (!isObj(data)) throw new DktParseError("Document root must be an object");
  if (data.version !== FORMAT_VERSION) {
    throw new DktParseError(`Unsupported version ${String(data.version)} (expected ${FORMAT_VERSION})`);
  }
  if (!Array.isArray(data.sheets) || data.sheets.length === 0) {
    throw new DktParseError("sheets must contain at least one sheet");
  }
  const sheets = data.sheets.map(checkSheet);
  const ids = new Set<string>();
  for (const s of sheets) {
    if (ids.has(s.id)) throw new DktParseError(`duplicate sheet id "${s.id}"`);
    ids.add(s.id);
  }
  const doc: DktDoc = { version: 1, sheets };
  if (data.active !== undefined) {
    if (typeof data.active !== "string" || !ids.has(data.active)) {
      throw new DktParseError("active must be the id of an existing sheet");
    }
    doc.active = data.active;
  }
  if (data.macros !== undefined) doc.macros = checkMacros(data.macros);
  return doc;
}
