/** Validation rules in `.dktable` (`DocSheet.validation`): round-trip and strict validation. */
import { describe, expect, it } from "vitest";
import { DktParseError, parse, serialize } from "./format";
import type { DktDoc } from "./types";
import type { ValRule } from "../engine/validation/types";

const base = { id: "s1", name: "S", cols: 26, rows: 100, cells: {} };
const wrap = (validation: unknown) => JSON.stringify({ version: 1, sheets: [{ ...base, validation }] });
const RULES: ValRule[] = [
  { range: "A1:A9", type: "whole", min: 1, max: 10 },
  { range: "B1:B9", type: "list", items: ["oui", "non"] },
  { range: "C1", type: "length", max: 3 },
];

describe("validation in .dktable", () => {
  it("round-trips rules", () => {
    const doc: DktDoc = { version: 1, sheets: [{ ...base, validation: RULES }] };
    expect(parse(serialize(doc))).toEqual(doc);
  });
  it("files without rules stay valid", () => {
    expect(parse(JSON.stringify({ version: 1, sheets: [base] })).sheets[0].validation).toBeUndefined();
  });
  it("rejects malformed rules", () => {
    for (const bad of ["x", [{ range: "A1", type: "nope" }], [{ range: "zz", type: "whole" }], [{ range: "A1", type: "list", items: [1] }], [{ range: "A1", type: "whole", min: "a" }]]) {
      expect(() => parse(wrap(bad))).toThrow(DktParseError);
    }
  });
});
