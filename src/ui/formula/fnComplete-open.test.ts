/** Function completion must stay quiet while typing an open range such as `=SUM(B2:B`. */
import { describe, expect, it } from "vitest";
import { fnCompletion } from "./fnComplete";
import { FN_DOCS } from "../fndocs";

describe("fnCompletion, open ranges", () => {
  it("no name list after ':' (B is a column, not the start of BAR)", () => {
    const t = "=SUM(B2:B";
    expect(fnCompletion(t, t.length, FN_DOCS)?.kind).not.toBe("list");
  });
  it("still shows the signature hint inside the call", () => {
    const t = "=SUM(B2:B";
    expect(fnCompletion(t, t.length, FN_DOCS)).toMatchObject({ kind: "hint", arg: 0 });
  });
});
