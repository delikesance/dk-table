import { describe, expect, it } from "vitest";
import { DktParseError, parse, serialize } from "./format";
import type { DktDoc } from "./types";

const base = { id: "s1", name: "S", cols: 26, rows: 100, cells: {} };
const wrap = (s: unknown) => JSON.stringify({ version: 1, sheets: [s] });

describe("frozen panes in .dktable", () => {
  it("round-trips freeze", () => {
    const doc: DktDoc = { version: 1, sheets: [{ ...base, freeze: { rows: 1, cols: 2 } }] };
    expect(parse(serialize(doc))).toEqual(doc);
  });
  it("accepts files without freeze", () => {
    expect(parse(wrap(base)).sheets[0].freeze).toBeUndefined();
  });
  it("rejects invalid freeze values", () => {
    for (const freeze of [[], 3, { rows: -1, cols: 0 }, { rows: 1.5, cols: 0 }, { rows: 1 }, { rows: "1", cols: 0 }]) {
      expect(() => parse(wrap({ ...base, freeze }))).toThrow(DktParseError);
    }
    expect(() => parse(wrap({ ...base, freeze: { rows: -1, cols: 0 } }))).toThrow(/freeze/);
  });
  it("drops unknown freeze props", () => {
    expect(parse(wrap({ ...base, freeze: { rows: 0, cols: 1, x: 2 } })).sheets[0].freeze).toEqual({ rows: 0, cols: 1 });
  });
});
