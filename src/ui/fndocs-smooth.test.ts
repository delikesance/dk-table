import { describe, expect, it } from "vitest";
import { FN_DOCS } from "./fndocs";
import { fnCompletion } from "./formula/fnComplete";

/** Sidebar docs + autocompletion for the smoothing spill functions (MOVING_AVERAGE, EXP_SMOOTH). */
describe("FN_DOCS smoothing", () => {
  it("documents MOVING_AVERAGE and EXP_SMOOTH", () => {
    const names = FN_DOCS.map((d) => d.name);
    expect(names).toContain("MOVING_AVERAGE");
    expect(names).toContain("EXP_SMOOTH");
  });
  it("is suggested by autocompletion", () => {
    const r = JSON.stringify(fnCompletion("=MOV", 4, FN_DOCS));
    expect(r).toContain("MOVING_AVERAGE");
  });
});
