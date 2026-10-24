import { describe, expect, it } from "vitest";
import { err, type Value } from "./types";
import type { Arg } from "./functions";
import { lookupFunctions as L } from "./fn-lookup";

/** Call a builtin; 2D matrices are passed as nested arrays (cast, like a 2D-aware evaluator would). */
const call = (n: string, ...a: unknown[]): Value => L[n](a as Arg[]);
const T: Value[][] = [[1, "a"], [2, "b"], [3, "c"]]; // A1:B3
const N_A = err("#N/A");

describe("VLOOKUP", () => {
  it("exact", () => expect(call("VLOOKUP", 2, T, 2, false)).toBe("b"));
  it("exact text, case-insensitive", () =>
    expect(call("VLOOKUP", "B", [["a", 1], ["b", 2]], 2, false)).toBe(2));
  it("approx takes last value <=", () => {
    expect(call("VLOOKUP", 2.5, T, 2)).toBe("b");
    expect(call("VLOOKUP", 9, T, 2, true)).toBe("c");
    expect(call("VLOOKUP", 0, T, 2)).toEqual(N_A);
  });
  it("not found / bad col", () => {
    expect(call("VLOOKUP", 5, T, 2, false)).toEqual(N_A);
    expect(call("VLOOKUP", 1, T, 3, false)).toEqual(err("#REF!"));
    expect(call("VLOOKUP", 1, T, 0, false)).toEqual(err("#VALUE!"));
  });
});

describe("HLOOKUP", () => {
  const H: Value[][] = [[1, 2, 3], ["a", "b", "c"]];
  it("exact", () => expect(call("HLOOKUP", 2, H, 2, false)).toBe("b"));
  it("approx", () => expect(call("HLOOKUP", 2.5, H, 2)).toBe("b"));
  it("not found / bad row", () => {
    expect(call("HLOOKUP", 7, H, 2, false)).toEqual(N_A);
    expect(call("HLOOKUP", 1, H, 3, false)).toEqual(err("#REF!"));
  });
});

describe("INDEX", () => {
  it("1D flat range", () => expect(call("INDEX", [10, 20, 30], 2)).toBe(20));
  it("2D", () => {
    expect(call("INDEX", T, 3, 2)).toBe("c");
    expect(call("INDEX", T, 2)).toBe(2);
  });
  it("out of bounds", () => {
    expect(call("INDEX", T, 4, 1)).toEqual(err("#REF!"));
    expect(call("INDEX", T, 1, 3)).toEqual(err("#REF!"));
    expect(call("INDEX", [1, 2], 0)).toEqual(err("#REF!"));
  });
});

describe("MATCH", () => {
  it("type 0 exact", () => {
    expect(call("MATCH", "B", ["a", "b", "c"], 0)).toBe(2);
    expect(call("MATCH", 9, [1, 2], 0)).toEqual(N_A);
  });
  it("type 1 default: last <=", () => {
    expect(call("MATCH", 2.5, [1, 2, 3])).toBe(2);
    expect(call("MATCH", 0, [1, 2, 3], 1)).toEqual(N_A);
  });
  it("type -1: smallest >= in descending", () => {
    expect(call("MATCH", 2.5, [3, 2, 1], -1)).toBe(1);
    expect(call("MATCH", 4, [3, 2, 1], -1)).toEqual(N_A);
  });
});

describe("XLOOKUP", () => {
  it("found", () => expect(call("XLOOKUP", 2, [1, 2, 3], ["x", "y", "z"])).toBe("y"));
  it("default if not found", () =>
    expect(call("XLOOKUP", 9, [1, 2], ["x", "y"], "none")).toBe("none"));
  it("not found without default", () => expect(call("XLOOKUP", 9, [1], ["x"])).toEqual(N_A));
  it("length mismatch", () => expect(call("XLOOKUP", 1, [1, 2], ["x"])).toEqual(err("#VALUE!")));
});
