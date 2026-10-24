import { describe, it, expect } from "vitest";
import { toTsv, fromTsv } from "./clipboard";

describe("tsv", () => {
  it("encodes a matrix", () => {
    expect(toTsv([["a", "b"], ["c", "d"]])).toBe("a\tb\nc\td");
  });
  it("decodes, handling CRLF and trailing newline", () => {
    expect(fromTsv("a\tb\r\nc\td\r\n")).toEqual([["a", "b"], ["c", "d"]]);
  });
});
