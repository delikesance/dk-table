import { describe, it, expect } from "vitest";
import { formatValue } from "./numfmt";

const norm = (s: string) => s.replace(/[  ]/g, " ");

describe("formatValue", () => {
  it("percent", () => expect(norm(formatValue("0.5", "percent"))).toBe("50 %"));
  it("currency", () => expect(norm(formatValue("1234.5", "currency"))).toBe("1 234,50 €"));
  it("number 2 decimals", () => expect(norm(formatValue("3", "number"))).toBe("3,00"));
  it("general and undefined leave text unchanged", () => {
    expect(formatValue("1234.5", "general")).toBe("1234.5");
    expect(formatValue("1234.5", undefined)).toBe("1234.5");
  });
  it("non numeric text unchanged", () => {
    expect(formatValue("abc", "percent")).toBe("abc");
    expect(formatValue("", "currency")).toBe("");
    expect(formatValue("#DIV/0!", "number")).toBe("#DIV/0!");
  });
});

describe("formatValue accounting", () => {
  const FS = " ";
  it("positive: 2 decimals, euro after, trailing figure space", () => {
    expect(norm(formatValue("1234.5", "accounting"))).toBe(`1 234,50 €${FS}`);
  });
  it("negative in parentheses", () => expect(norm(formatValue("-1234.5", "accounting"))).toBe("(1 234,50 €)"));
  it("zero shown as dash", () => {
    expect(norm(formatValue("0", "accounting"))).toBe(`- €${FS}`);
    expect(norm(formatValue("-0.001", "accounting"))).toBe(`- €${FS}`);
  });
  it("right-aligned: positive pad matches the closing parenthesis", () => {
    expect(formatValue("12.3", "accounting").length).toBe(formatValue("-12.3", "accounting").length - 1);
  });
  it("non numeric text unchanged", () => {
    expect(formatValue("abc", "accounting")).toBe("abc");
    expect(formatValue("", "accounting")).toBe("");
  });
});

describe("formatValue date", () => {
  it("serial to DD/MM/YYYY", () => {
    expect(formatValue("46319", "date")).toBe("24/10/2026");
    expect(formatValue("45292", "date")).toBe("01/01/2024");
  });
  it("Excel 1900 bounds", () => {
    expect(formatValue("1", "date")).toBe("01/01/1900");
    expect(formatValue("59", "date")).toBe("28/02/1900");
    expect(formatValue("60", "date")).toBe("29/02/1900");
    expect(formatValue("61", "date")).toBe("01/03/1900");
  });
  it("time part ignored", () => expect(formatValue("46319.75", "date")).toBe("24/10/2026"));
  it("ISO text", () => expect(formatValue("2026-11-01", "date")).toBe("01/11/2026"));
  it("invalid ISO unchanged", () => expect(formatValue("2026-13-45", "date")).toBe("2026-13-45"));
  it("unchanged cases", () => {
    expect(formatValue("abc", "date")).toBe("abc");
    expect(formatValue("", "date")).toBe("");
    expect(formatValue("-5", "date")).toBe("-5");
    expect(formatValue("0", "date")).toBe("0");
    expect(formatValue("99999999999", "date")).toBe("99999999999");
  });
  it("max serial 2958465 is 31/12/9999", () => {
    expect(formatValue("2958465", "date")).toBe("31/12/9999");
    expect(formatValue("2958466", "date")).toBe("2958466");
  });
});
