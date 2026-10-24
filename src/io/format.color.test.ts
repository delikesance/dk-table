/** Tests for the persisted text color (`style.color`): round-trip, old files, validation. */
import { describe, expect, it } from "vitest";
import { DktParseError, parse, serialize } from "./format";
import type { DktDoc } from "./types";

const doc = (style?: object): DktDoc => ({
  version: 1,
  sheets: [{ id: "s1", name: "S", cols: 26, rows: 100, cells: {}, styles: style ? { A1: style } : undefined }],
});
const withColor = (c: unknown): string => JSON.stringify(doc({ color: c }));

describe("style.color", () => {
  it("round-trips a hex color", () => {
    expect(parse(serialize(doc({ color: "#c00" }))).sheets[0].styles?.A1.color).toBe("#c00");
  });
  it("accepts #rrggbb and palette values", () => {
    expect(parse(withColor("#a8201a")).sheets[0].styles?.A1.color).toBe("#a8201a");
    expect(parse(withColor("#1d1d1f")).sheets[0].styles?.A1.color).toBe("#1d1d1f");
  });
  it("reads old files without color", () => {
    expect(parse(serialize(doc({ bold: true }))).sheets[0].styles?.A1).toEqual({ bold: true });
  });
  it.each([["red"], ["#12"], ["#ggg"], ["#12345678"], [5], [null]])("rejects %j", (c) => {
    expect(() => parse(withColor(c))).toThrow(DktParseError);
  });
});
