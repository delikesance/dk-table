import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createSheet, setCell, getDisplay } from "./sheet";
import { registerFunction } from "./functions";
import { dateFunctions, setClock, serialToISO } from "./fn-date";

/** Evaluate a formula in A1 of a fresh sheet. */
function ev(f: string): string {
  const s = createSheet();
  setCell(s, "A1", f);
  return getDisplay(s, "A1");
}

beforeEach(() => {
  for (const [n, f] of Object.entries(dateFunctions)) registerFunction(n, f);
});
afterEach(() => setClock(Date.now));

describe("date functions", () => {
  it("YEAR/MONTH/DAY of DATE", () => {
    expect(ev("=YEAR(DATE(2026,10,24))")).toBe("2026");
    expect(ev("=MONTH(DATE(2026,10,24))")).toBe("10");
    expect(ev("=DAY(DATE(2026,10,24))")).toBe("24");
  });
  it("DATE overflows months and days", () => {
    expect(ev("=YEAR(DATE(2026,13,1))")).toBe("2027");
    expect(ev("=MONTH(DATE(2026,13,1))")).toBe("1");
    expect(ev("=DAY(DATE(2026,1,32))")).toBe("1");
    expect(ev("=MONTH(DATE(2026,1,32))")).toBe("2");
  });
  it("DATE serial numbers", () => {
    expect(ev("=DATE(1900,1,1)")).toBe("2");
    expect(ev("=DATE(1899,12,30)")).toBe("0");
    expect(ev("=DATE(2026,10,24)")).toBe("46319");
  });
  it("TODAY/NOW use the injected clock", () => {
    setClock(() => new Date(2026, 9, 24, 12, 0, 0).getTime());
    expect(ev("=TODAY()")).toBe("46319");
    expect(ev("=NOW()")).toBe("46319.5");
    expect(ev("=DAY(TODAY())")).toBe("24");
  });
  it("invalid arguments give #VALUE!", () => {
    expect(ev('=YEAR("abc")')).toBe("#VALUE!");
    expect(ev("=DATE(2026,10)")).toBe("#VALUE!");
    expect(ev("=YEAR()")).toBe("#VALUE!");
    expect(ev("=MONTH(-1)")).toBe("#VALUE!");
  });
  it("serialToISO", () => {
    expect(serialToISO(46319)).toBe("2026-10-24");
    expect(serialToISO(0)).toBe("1899-12-30");
    expect(serialToISO(46319.75)).toBe("2026-10-24");
  });
});
