/**
 * Round trip of a cell background: apply fill -> serialize -> parse -> same fill,
 * plus validation of bad fill values.
 */
import { describe, it, expect } from "vitest";
import { serialize, parse, DktParseError } from "./format";
import { newEntry } from "../ui/model";
import type { DktDoc } from "./types";

/** Build a doc from a model entry carrying a fill on B2. */
function docWithFill(fill: string): DktDoc {
  const e = newEntry("S");
  e.styles.B2 = { fill, bold: true };
  return { version: 1, sheets: [{ id: e.id, name: e.name, cols: 26, rows: 100, cells: { B2: { raw: "7" } }, styles: e.styles }] };
}

describe("background round trip", () => {
  it("serialize -> parse keeps the same fill", () => {
    const back = parse(serialize(docWithFill("#ff8800")));
    expect(back.sheets[0].styles?.B2).toEqual({ fill: "#ff8800", bold: true });
  });
  it("reload into a model entry exposes the same fill", () => {
    const back = parse(serialize(docWithFill("rgb(1, 2, 3)")));
    const e = newEntry(back.sheets[0].name, back.sheets[0]);
    expect(e.styles.B2.fill).toBe("rgb(1, 2, 3)");
  });
  it("a sheet without styles stays without fill", () => {
    const d = docWithFill("#fff");
    delete d.sheets[0].styles;
    expect(parse(serialize(d)).sheets[0].styles).toBeUndefined();
  });
  it("rejects a non-string fill", () => {
    const bad = JSON.parse(serialize(docWithFill("#fff")));
    bad.sheets[0].styles.B2.fill = 5;
    expect(() => parse(JSON.stringify(bad))).toThrow(DktParseError);
  });
});
