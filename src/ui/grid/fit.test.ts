/** Auto-fit of column widths to their content (pure math, DOM measure injected). */
import { describe, expect, it } from "vitest";
import { colsOfSelection, fitColumn } from "./fit";

describe("colsOfSelection", () => {
  it("lists the columns spanned by a selection", () => {
    expect(colsOfSelection("C3")).toEqual([2]);
    expect(colsOfSelection("B1:D9")).toEqual([1, 2, 3]);
    expect(colsOfSelection("D9:B1")).toEqual([1, 2, 3]);
  });
});

describe("fitColumn", () => {
  it("fits the longest text with the column name, padded", () => {
    expect(fitColumn("A", [{ text: "abc" }, { text: "abcdefghij" }])).toBe(10 * 7 + 20);
  });
  it("bold text is wider", () => {
    expect(fitColumn("A", [{ text: "abcdefghij", bold: true }])).toBeGreaterThan(fitColumn("A", [{ text: "abcdefghij" }]));
  });
  it("uses the injected measure when given (real DOM width)", () => {
    expect(fitColumn("A", [{ text: "xx" }], (t) => (t === "xx" ? 150 : 5))).toBe(150 + 20);
  });
  it("never goes under the minimum width, empty column included", () => {
    expect(fitColumn("A", [])).toBe(32);
  });
  it("is capped at the maximum width", () => {
    expect(fitColumn("A", [{ text: "x".repeat(500) }])).toBe(800);
  });
});
