import { describe, it, expect } from "vitest";
import { createSheet } from "./sheet";

describe("createSheet", () => {
  it("returns an empty 26x100 sheet", () => {
    expect(createSheet()).toEqual({ cols: 26, rows: 100, cells: {} });
  });
});
