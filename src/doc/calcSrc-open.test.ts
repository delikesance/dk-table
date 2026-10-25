/** Document chips: open-ended ranges in stored formulas (`{s1}!B2:B`). */
import { describe, expect, it } from "vitest";
import { liveCall, toDisplay, toEngine, toStored } from "./calcSrc";

const sheets = [{ id: "s1", name: "Ventes 2026" }];

describe("calcSrc, open ranges", () => {
  it("names <-> ids around an open range", () => {
    expect(toStored("SUM('Ventes 2026'!B2:B)", sheets)).toBe("SUM({s1}!B2:B)");
    expect(toEngine("SUM({s1}!B:B)", sheets)).toBe("SUM('Ventes 2026'!B:B)");
    expect(toDisplay("SUM({s1}!2:5)", sheets)).toBe("SUM('Ventes 2026'!2:5)");
  });
  it("liveCall reads open ranges", () => {
    expect(liveCall("SPARKLINE({s1}!B2:B)")).toEqual({ fn: "SPARKLINE", sheet: "s1", range: "B2:B" });
    expect(liveCall("bar({s1}!$B:$C)")).toEqual({ fn: "BAR", sheet: "s1", range: "B:C" });
    expect(liveCall("TREND({s1}!B3:B8)")).toMatchObject({ range: "B3:B8" });
    expect(liveCall("TREND({s1}!B3)")).toMatchObject({ range: "B3" });
    expect(liveCall("TREND({s1}!)")).toBeNull();
  });
});
