/** `.dktable` JSON format: pure serialize / strict parse with clear errors. */
import { FORMAT_VERSION, type CellStyle, type DktDoc, type DocSheet } from "./types";

/** Thrown by `parse` when the text is not a valid `.dktable` document. */
export class DktParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DktParseError";
  }
}

const REF = /^[A-Z]+[1-9]\d*$/;
/** Accepted text colors: `#rgb` / `#rrggbb` (palette values are all in this form). */
const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** True for plain (non-array, non-null) objects. */
function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** True for integers >= 1. */
function isDim(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 1;
}

/** Validates one style object, keeping only known props; throws a located DktParseError. */
function checkStyle(v: unknown, at: string): CellStyle {
  if (!isObj(v)) throw new DktParseError(`${at} must be an object`);
  const st: CellStyle = {};
  for (const k of ["bold", "italic"] as const) {
    if (v[k] === undefined) continue;
    if (typeof v[k] !== "boolean") throw new DktParseError(`${at}.${k} must be a boolean`);
    st[k] = v[k] as boolean;
  }
  if (v.align !== undefined) {
    if (v.align !== "left" && v.align !== "center" && v.align !== "right") {
      throw new DktParseError(`${at}.align must be left, center or right`);
    }
    st.align = v.align;
  }
  if (v.color !== undefined) {
    if (typeof v.color !== "string" || !HEX.test(v.color)) {
      throw new DktParseError(`${at}.color must be #rgb or #rrggbb`);
    }
    st.color = v.color;
  }
  for (const k of ["fill", "format"] as const) {
    if (v[k] === undefined) continue;
    if (typeof v[k] !== "string") throw new DktParseError(`${at}.${k} must be a string`);
    st[k] = v[k] as string;
  }
  return st;
}

/** Validates the optional `styles` map of a sheet. */
function checkStyles(raw: unknown, at: string): Record<string, CellStyle> {
  if (!isObj(raw)) throw new DktParseError(`${at}.styles must be an object`);
  const out: Record<string, CellStyle> = {};
  for (const [ref, v] of Object.entries(raw)) {
    if (!REF.test(ref)) throw new DktParseError(`${at}.styles: invalid cell reference "${ref}"`);
    out[ref] = checkStyle(v, `${at}.styles.${ref}`);
  }
  return out;
}

/** Validates the optional `freeze` of a sheet: integers >= 0, unknown props dropped. */
function checkFreeze(v: unknown, at: string): NonNullable<DocSheet["freeze"]> {
  const ok = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0;
  if (!isObj(v) || !ok(v.rows) || !ok(v.cols)) {
    throw new DktParseError(`${at}.freeze must be {rows, cols} with integers >= 0`);
  }
  return { rows: v.rows, cols: v.cols };
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
  const sheet: DocSheet = { id: s.id, name: s.name, cols: s.cols, rows: s.rows, cells };
  if (s.styles !== undefined) sheet.styles = checkStyles(s.styles, at);
  if (s.freeze !== undefined) sheet.freeze = checkFreeze(s.freeze, at);
  return sheet;
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
  return doc;
}
