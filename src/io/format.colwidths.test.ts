import { describe, expect, it } from "vitest";
import { DktParseError, parse, serialize } from "./format";
import type { DktDoc } from "./types";

const base = { id: "s1", name: "S", cols: 26, rows: 100, cells: {} };
const wrap = (s: unknown) => JSON.stringify({ version: 1, sheets: [s] });

describe("column widths in .dktable", () => {
  it("round-trips colWidths keyed by column letters", () => {
    const doc: DktDoc = { version: 1, sheets: [{ ...base, colWidths: { A: 140, C: 60, AA: 200 } }] };
    expect(parse(serialize(doc))).toEqual(doc);
  });
  it("accepts older files without colWidths", () => {
    expect(parse(wrap(base)).sheets[0].colWidths).toBeUndefined();
  });
  it("rejects invalid colWidths", () => {
    for (const colWidths of [[], 3, { a: 10 }, { "1": 10 }, { A: "10" }, { A: -5 }, { A: 0 }, { A: NaN }]) {
      expect(() => parse(wrap({ ...base, colWidths }))).toThrow(DktParseError);
    }
    expect(() => parse(wrap({ ...base, colWidths: { A: -5 } }))).toThrow(/colWidths/);
  });
});
