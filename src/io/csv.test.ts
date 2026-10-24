import { describe, expect, it } from "vitest";
import { fromCsv, toCsv } from "./csv";
import type { DocSheet } from "./types";

const sheet = (cells: Record<string, string>): DocSheet => ({
  id: "s", name: "S", cols: 5, rows: 5,
  cells: Object.fromEntries(Object.entries(cells).map(([k, raw]) => [k, { raw }])),
});

describe("toCsv", () => {
  it("exports bounding box of used cells", () => {
    expect(toCsv(sheet({ A1: "a", B1: "b", A2: "c" }))).toBe("a,b\r\nc,");
  });
  it("quotes delimiter, quotes and newlines", () => {
    expect(toCsv(sheet({ A1: 'x,"y"', B1: "l1\nl2" }))).toBe('"x,""y""","l1\nl2"');
  });
  it("supports ; delimiter", () => {
    expect(toCsv(sheet({ A1: "a;b", B1: "c,d" }), ";")).toBe('"a;b";c,d');
  });
  it("empty sheet gives empty string", () => {
    expect(toCsv(sheet({}))).toBe("");
  });
});

describe("fromCsv", () => {
  it("parses simple, skipping empty cells", () => {
    const r = fromCsv("a,b\r\nc,");
    expect(r.cells).toEqual({ A1: { raw: "a" }, B1: { raw: "b" }, A2: { raw: "c" } });
    expect(r.cols).toBe(2);
    expect(r.rows).toBe(2);
  });
  it("handles quotes, escaped quotes, embedded newlines", () => {
    const r = fromCsv('"x,""y""","l1\nl2"\n');
    expect(r.cells.A1.raw).toBe('x,"y"');
    expect(r.cells.B1.raw).toBe("l1\nl2");
    expect(r.rows).toBe(1);
  });
  it("auto-detects ; delimiter", () => {
    expect(fromCsv("a;b;c").cols).toBe(3);
  });
  it("explicit delimiter wins", () => {
    expect(fromCsv("a;b,c", ",").cells.A1.raw).toBe("a;b");
  });
  it("strips BOM", () => {
    expect(fromCsv("﻿a,b").cells.A1.raw).toBe("a");
  });
  it("round-trips", () => {
    const s = sheet({ A1: 'q"1', B1: "x;y", C2: "z", A3: "l\nm" });
    expect(fromCsv(toCsv(s), ",").cells).toEqual({ ...s.cells });
  });
  it("empty input yields min 1x1", () => {
    const r = fromCsv("");
    expect([r.cols, r.rows, Object.keys(r.cells).length]).toEqual([1, 1, 0]);
  });
});
