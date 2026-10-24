import { describe, expect, it } from "vitest";
import { DktParseError, parse, serialize } from "./format";
import type { DktDoc } from "./types";

const base = { id: "s1", name: "S", cols: 26, rows: 100, cells: { A1: { raw: "1" } } };
const wrap = (s: unknown) => JSON.stringify({ version: 1, sheets: [s] });

describe("cell styles in .dktable", () => {
  it("round-trips styles", () => {
    const doc: DktDoc = { version: 1, sheets: [{ ...base,
      styles: { A1: { bold: true, italic: true, align: "center", fill: "#ff0000", format: "0.00" } } }] };
    expect(parse(serialize(doc))).toEqual(doc);
  });
  it("accepts old files without styles", () => {
    expect(parse(wrap(base)).sheets[0].styles).toBeUndefined();
  });
  it("drops unknown style props, rejects bad ones", () => {
    const p = parse(wrap({ ...base, styles: { A1: { bold: true, zap: 1 } } }));
    expect(p.sheets[0].styles).toEqual({ A1: { bold: true } });
    expect(() => parse(wrap({ ...base, styles: { A1: { align: "up" } } }))).toThrow(DktParseError);
    expect(() => parse(wrap({ ...base, styles: { zz: { bold: true } } }))).toThrow(/zz/);
    expect(() => parse(wrap({ ...base, styles: [] }))).toThrow(/styles/);
  });
});
