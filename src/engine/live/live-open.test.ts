/** Live cells (SPARKLINE/BAR/TREND) over open-ended ranges: =SPARKLINE(B2:B). */
import { describe, expect, it } from "vitest";
import { liveResult, registerLive } from "./adapter";
import { createSheet, getRangeValues, setCell } from "../sheet";

describe("liveResult, open ranges", () => {
  it("accepts B2:B, B:B, 2:2 and $ markers, and hands the range text on", () => {
    registerLive();
    const seen: string[] = [];
    const r = (rng: string) => (seen.push(rng), [1, 2, 3]);
    for (const f of ["B2:B", "B:B", "2:2", "$B$2:$B", "A1:A5"])
      expect(liveResult(`=SPARKLINE(${f})`, r)).toMatchObject({ kind: "html" });
    expect(seen).toEqual(["B2:B", "B:B", "2:2", "$B$2:$B", "A1:A5"]);
  });
  it("end to end with the engine: values from B2 to the last used row", () => {
    const s = createSheet();
    ["x", "1", "2", "3"].forEach((v, i) => setCell(s, `B${i + 1}`, v));
    expect(getRangeValues(s, "$B$2:$B")).toEqual([1, 2, 3]);
    expect(liveResult("=SPARKLINE(B2:B)", (r) => getRangeValues(s, r))).toMatchObject({ kind: "html" });
  });
  it("still rejects nested use", () => {
    expect(liveResult('="x"&SPARKLINE(B2:B)', () => [])).toBeNull();
  });
});
