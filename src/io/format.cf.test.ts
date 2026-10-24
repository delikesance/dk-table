/** Conditional formatting rules in `.dktable` (`DocSheet.cf`): round-trip and strict validation. */
import { describe, expect, it } from "vitest";
import { DktParseError, parse, serialize } from "./format";
import type { DktDoc } from "./types";
import type { CfRule } from "../engine/cf/types";

const base = { id: "s1", name: "S", cols: 26, rows: 100, cells: {} };
const wrap = (cf: unknown) => JSON.stringify({ version: 1, sheets: [{ ...base, cf }] });
const RULES: CfRule[] = [
  { id: "a", range: "A1:A9", type: "cell", op: "between", a: "1", b: "=B1", format: { fill: "#fde2e0", bold: true } },
  { id: "b", range: "B1:B9", type: "text", op: "contains", text: "x", format: { color: "#a8201a" } },
  { id: "c", range: "C1:C9", type: "duplicate", format: { italic: true } },
  { id: "d", range: "D1:D9", type: "top", n: 10, percent: true, format: { fill: "#d9f2dd" } },
  { id: "e", range: "E1:E9", type: "formula", formula: "=E1>0", format: { fill: "#d9f2dd" } },
  { id: "f", range: "F1:F9", type: "scale", min: "#ffffff", mid: "#fdf3c4", max: "#0000f2" },
  { id: "g", range: "G1:G9", type: "bar", color: "#0000f2" },
];

describe("conditional formatting in .dktable", () => {
  it("round-trips every rule type", () => {
    const doc: DktDoc = { version: 1, sheets: [{ ...base, cf: RULES }] };
    expect(parse(serialize(doc))).toEqual(doc);
  });
  it("files without rules stay valid", () => {
    expect(parse(JSON.stringify({ version: 1, sheets: [base] })).sheets[0].cf).toBeUndefined();
  });
  it("rejects malformed rules with a located message", () => {
    const bad: unknown[] = [
      {}, [1], [{ ...RULES[0], type: "nope" }], [{ ...RULES[0], op: "gte" }], [{ ...RULES[0], range: 3 }],
      [{ ...RULES[0], format: { fill: 1 } }], [{ ...RULES[3], n: -1 }], [{ ...RULES[5], min: "red" }],
      [{ ...RULES[6], color: undefined }], [{ ...RULES[1], text: 2 }], [{ ...RULES[0], id: "" }],
    ];
    for (const cf of bad) expect(() => parse(wrap(cf)), JSON.stringify(cf)).toThrow(DktParseError);
    expect(() => parse(wrap([{ ...RULES[0], op: "gte" }]))).toThrow(/cf\[0\]\.op/);
  });
  it("drops unknown properties", () => {
    const doc = parse(wrap([{ ...RULES[2], extra: 1, format: { italic: true, zz: 1 } }]));
    expect(doc.sheets[0].cf).toEqual([RULES[2]]);
  });
});
