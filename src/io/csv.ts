/** CSV import/export as pure functions (RFC 4180 quoting, `,` or `;`). */
import type { DocSheet } from "./types";

/** Supported field delimiters. */
export type Delimiter = "," | ";";

/** Result of `fromCsv`: sheet dimensions and cells (no id/name). */
export type CsvSheet = Pick<DocSheet, "cols" | "rows" | "cells">;

/** Converts a 0-based column index to letters (0 -> A, 26 -> AA). */
function colName(n: number): string {
  let s = "";
  for (let i = n + 1; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s;
  return s;
}

/** Parses an A1 ref into 0-based [col,row], or null if malformed. */
function parseRef(ref: string): [number, number] | null {
  const m = /^([A-Z]+)(\d+)$/.exec(ref);
  if (!m) return null;
  let c = 0;
  for (const ch of m[1]) c = c * 26 + ch.charCodeAt(0) - 64;
  return [c - 1, Number(m[2]) - 1];
}

/** Quotes a field when it contains the delimiter, a quote or a newline. */
function quote(v: string, d: Delimiter): string {
  return /["\r\n]/.test(v) || v.includes(d) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Exports the bounding box of non-empty cells as CSV (CRLF rows). */
export function toCsv(sheet: DocSheet, delimiter: Delimiter = ","): string {
  const grid = new Map<string, string>();
  let maxC = -1;
  let maxR = -1;
  for (const [ref, cell] of Object.entries(sheet.cells)) {
    const p = parseRef(ref);
    if (!p || cell.raw === "") continue;
    grid.set(`${p[0]},${p[1]}`, cell.raw);
    maxC = Math.max(maxC, p[0]);
    maxR = Math.max(maxR, p[1]);
  }
  const lines: string[] = [];
  for (let r = 0; r <= maxR; r++) {
    const row: string[] = [];
    for (let c = 0; c <= maxC; c++) row.push(quote(grid.get(`${c},${r}`) ?? "", delimiter));
    lines.push(row.join(delimiter));
  }
  return lines.join("\r\n");
}

/** Guesses the delimiter from the first line (`;` if more `;` than `,`). */
function detect(text: string): Delimiter {
  const first = text.split(/\r?\n/, 1)[0];
  const semi = first.split(";").length;
  return semi > first.split(",").length ? ";" : ",";
}

/** Splits CSV text into rows of fields, honoring quotes. */
function records(text: string, d: Delimiter): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let f = "";
  let inQ = false;
  let any = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch !== '"') f += ch;
      else if (text[i + 1] === '"') { f += '"'; i++; }
      else inQ = false;
    } else if (ch === '"') { inQ = true; any = true; }
    else if (ch === d) { row.push(f); f = ""; any = true; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(f); rows.push(row); row = []; f = ""; any = false;
    } else { f += ch; any = true; }
  }
  if (any || f !== "" || row.length) { row.push(f); rows.push(row); }
  return rows;
}

/** Imports CSV text; delimiter auto-detected unless given. Min size 1x1. */
export function fromCsv(text: string, delimiter?: Delimiter): CsvSheet {
  const t = text.replace(/^﻿/, "");
  const rows = records(t, delimiter ?? detect(t));
  const cells: CsvSheet["cells"] = {};
  let cols = 1;
  rows.forEach((fields, r) => {
    cols = Math.max(cols, fields.length);
    fields.forEach((v, c) => {
      if (v !== "") cells[`${colName(c)}${r + 1}`] = { raw: v };
    });
  });
  return { cols, rows: Math.max(1, rows.length), cells };
}
