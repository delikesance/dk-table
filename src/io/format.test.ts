import { describe, expect, it } from "vitest";
import { DktParseError, parse, serialize } from "./format";
import type { DktDoc } from "./types";

const doc: DktDoc = {
  version: 1,
  sheets: [{ id: "s1", name: "Sheet1", cols: 26, rows: 100, cells: { A1: { raw: "1" }, B2: { raw: "=A1*2" } } }],
  active: "s1",
};

describe("serialize/parse", () => {
  it("round-trips", () => {
    expect(parse(serialize(doc))).toEqual(doc);
  });
  it("accepts missing active", () => {
    const { active: _a, ...rest } = doc;
    expect(parse(serialize(rest as DktDoc)).active).toBeUndefined();
  });
  it("rejects invalid JSON", () => {
    expect(() => parse("{nope")).toThrow(DktParseError);
    expect(() => parse("{nope")).toThrow(/JSON/);
  });
  it("rejects unsupported version", () => {
    expect(() => parse('{"version":2,"sheets":[]}')).toThrow(/version 2/);
  });
  it("rejects non-object root", () => {
    expect(() => parse("[]")).toThrow(/object/);
  });
  it("rejects bad sheets", () => {
    const bad = (s: unknown) => JSON.stringify({ version: 1, sheets: [s] });
    expect(() => parse(bad({ id: "a", name: "n", cols: 0, rows: 1, cells: {} }))).toThrow(/cols/);
    expect(() => parse(bad({ id: "a", name: "n", cols: 1, rows: 1.5, cells: {} }))).toThrow(/rows/);
    expect(() => parse(bad({ id: 1, name: "n", cols: 1, rows: 1, cells: {} }))).toThrow(/id/);
    expect(() => parse(bad({ id: "a", name: "n", cols: 1, rows: 1, cells: { A1: { raw: 3 } } }))).toThrow(/A1/);
    expect(() => parse(bad({ id: "a", name: "n", cols: 1, rows: 1, cells: { zz: { raw: "" } } }))).toThrow(/zz/);
  });
  it("rejects empty sheets, duplicate ids, unknown active", () => {
    expect(() => parse('{"version":1,"sheets":[]}')).toThrow(/at least one/);
    const s = { id: "a", name: "n", cols: 1, rows: 1, cells: {} };
    expect(() => parse(JSON.stringify({ version: 1, sheets: [s, s] }))).toThrow(/duplicate/);
    expect(() => parse(JSON.stringify({ version: 1, sheets: [s], active: "x" }))).toThrow(/active/);
  });
  it("round-trips macros and rejects malformed ones", () => {
    const withMacros: DktDoc = { ...doc, macros: [{ id: "m1", name: "Totaux", code: 'print("ok")' }] };
    expect(parse(serialize(withMacros))).toEqual(withMacros);
    const bad = (m: unknown) => JSON.stringify({ ...doc, macros: m });
    expect(() => parse(bad({}))).toThrow(/macros/);
    expect(() => parse(bad([{ id: "m1", name: "x", code: 1 }]))).toThrow(/macros\[0\].code/);
    expect(() => parse(bad([{ id: "", name: "x", code: "" }]))).toThrow(/macros\[0\].id/);
  });
});
