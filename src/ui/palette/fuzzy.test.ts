import { describe, expect, it } from "vitest";
import { fuzzyFilter, fuzzyScore } from "./fuzzy";

describe("fuzzyScore", () => {
  it("returns null when query is not a subsequence", () => {
    expect(fuzzyScore("xyz", "Insert row")).toBeNull();
  });
  it("matches case-insensitively as subsequence", () => {
    expect(fuzzyScore("irw", "Insert row")).not.toBeNull();
  });
  it("empty query matches with score 0", () => {
    expect(fuzzyScore("", "anything")).toBe(0);
  });
  it("prefers consecutive and word-start matches", () => {
    const a = fuzzyScore("row", "Insert row")!;
    const b = fuzzyScore("row", "Rotate view window")!;
    expect(a).toBeGreaterThan(b);
  });
  it("prefers prefix matches", () => {
    expect(fuzzyScore("sort", "Sort A-Z")!).toBeGreaterThan(fuzzyScore("sort", "Resort")!);
  });
});

describe("fuzzyFilter", () => {
  const items = ["Insert row", "Delete row", "Sort A-Z", "Bold"];
  it("returns all items in order for empty query", () => {
    expect(fuzzyFilter("", items, (s) => s)).toEqual(items);
  });
  it("filters and ranks by score", () => {
    expect(fuzzyFilter("sort", items, (s) => s)[0]).toBe("Sort A-Z");
    expect(fuzzyFilter("row", items, (s) => s)).toEqual(["Insert row", "Delete row"]);
  });
  it("drops non-matches", () => {
    expect(fuzzyFilter("zzz", items, (s) => s)).toEqual([]);
  });
});
