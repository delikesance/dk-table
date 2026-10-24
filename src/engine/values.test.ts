/** Unit tests for values.ts: toNum/toText/toBool coercions, isDecimal, fmtNum and displayValue. */
import { describe, it, expect } from "vitest";
import { toNum, toText, toBool, isDecimal, fmtNum, displayValue } from "./values";
import { err } from "./types";

describe("isDecimal", () => {
  it("accepts plain decimals, signs, exponents, padding", () => {
    for (const s of ["1", "-1", "+1", "1.5", ".5", "5.", "1e3", "1E-3", " 7 "]) expect(isDecimal(s), s).toBe(true);
  });
  it("rejects hex/bin/oct, Infinity, empty, junk", () => {
    for (const s of ["0x10", "0b1", "0o7", "Infinity", "", " ", "abc", "1,5", "1e", "--1", "."]) expect(isDecimal(s), s).toBe(false);
  });
});

describe("toNum", () => {
  it("passes numbers, converts booleans", () => {
    expect(toNum(3)).toBe(3);
    expect(toNum(true)).toBe(1);
    expect(toNum(false)).toBe(0);
  });
  it("blank text is 0, numeric text parsed, other text #VALUE!", () => {
    expect(toNum("")).toBe(0);
    expect(toNum("  ")).toBe(0);
    expect(toNum("2.5")).toBe(2.5);
    expect(toNum("abc")).toEqual(err("#VALUE!"));
    expect(toNum("0x10")).toEqual(err("#VALUE!"));
    expect(toNum("Infinity")).toEqual(err("#VALUE!"));
  });
  it("propagates errors", () => {
    expect(toNum(err("#DIV/0!"))).toEqual(err("#DIV/0!"));
  });
});

describe("toText / displayValue", () => {
  it("numbers, text, booleans, errors", () => {
    expect(toText(12)).toBe("12");
    expect(toText("hi")).toBe("hi");
    expect(toText(true)).toBe("TRUE");
    expect(toText(false)).toBe("FALSE");
    expect(toText(err("#REF!"))).toBe("#REF!");
    expect(displayValue(err("#NAME?"))).toBe("#NAME?");
    expect(displayValue(0.5)).toBe("0.5");
  });
});

describe("toBool", () => {
  it("booleans and numbers", () => {
    expect(toBool(true)).toBe(true);
    expect(toBool(0)).toBe(false);
    expect(toBool(-2)).toBe(true);
  });
  it("text TRUE/FALSE (any case), blank false, else #VALUE!", () => {
    expect(toBool("true")).toBe(true);
    expect(toBool("False")).toBe(false);
    expect(toBool("")).toBe(false);
    expect(toBool("yes")).toEqual(err("#VALUE!"));
  });
  it("propagates errors", () => {
    expect(toBool(err("#REF!"))).toEqual(err("#REF!"));
  });
});

describe("fmtNum", () => {
  it("trims floating-point noise", () => {
    expect(fmtNum(0.1 + 0.2)).toBe("0.3");
    expect(fmtNum(1 / 3)).toBe("0.333333333333");
    expect(fmtNum(100)).toBe("100");
    expect(fmtNum(-0)).toBe("0");
  });
  it("non-finite yields #VALUE!", () => {
    expect(fmtNum(Infinity)).toBe("#VALUE!");
    expect(fmtNum(NaN)).toBe("#VALUE!");
  });
});
