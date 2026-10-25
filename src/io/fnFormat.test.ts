/** Tests du champ `functions` du format .dktable (rétrocompatible). */
import { describe, expect, it } from "vitest";
import { parse, serialize } from "./format";
import type { DktDoc } from "./types";

const base: DktDoc = { version: 1, sheets: [{ id: "s1", name: "F", cols: 3, rows: 3, cells: {} }] };

describe("functions", () => {
  it("absent dans les anciens fichiers", () => {
    expect(parse(serialize(base)).functions).toBeUndefined();
  });
  it("aller-retour", () => {
    const doc = { ...base, functions: [{ name: "TVA", params: ["ht"], body: "=ht*1.2" }] };
    expect(parse(serialize(doc)).functions).toEqual(doc.functions);
  });
  it("refuse un format invalide", () => {
    const bad = (f: unknown) => () => parse(JSON.stringify({ ...base, functions: f }));
    expect(bad("x")).toThrow(/functions/);
    expect(bad([{ name: "A", params: "x", body: "" }])).toThrow(/params/);
  });
});
