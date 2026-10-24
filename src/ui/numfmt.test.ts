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
