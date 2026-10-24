/** `.dktable` validation of underline, wrap and borders. */
import { describe, expect, it } from "vitest";
import { parse, serialize, DktParseError } from "./format";
import type { DktDoc } from "./types";

/** Doc with one sheet whose A1 style is `st`. */
const doc = (st: unknown): string => JSON.stringify({
  version: 1, sheets: [{ id: "s", name: "S", cols: 2, rows: 2, cells: {}, styles: { A1: st } }],
});

describe("format: underline / wrap / borders", () => {
  it("round-trips the new keys", () => {
    const d: DktDoc = { version: 1, sheets: [{ id: "s", name: "S", cols: 2, rows: 2, cells: {},
      styles: { A1: { underline: true, wrap: true, borders: { t: true, r: true, b: true, l: true } } } }] };
    expect(parse(serialize(d))).toEqual(d);
  });
  it("keeps only known border edges", () => {
    expect(parse(doc({ borders: { t: true, x: true } })).sheets[0].styles!.A1).toEqual({ borders: { t: true } });
  });
  it.each([
    [{ underline: "yes" }, "underline"],
    [{ wrap: 1 }, "wrap"],
    [{ borders: true }, "borders"],
    [{ borders: { t: "1" } }, "borders.t"],
  ])("rejects %j", (st, msg) => {
    expect(() => parse(doc(st))).toThrow(DktParseError);
    expect(() => parse(doc(st))).toThrow(msg);
  });
});
