import { describe, it, expect } from "vitest";
import { sparklineSvg, barSvg, trendInfo, trendHtml, liveFunctions } from "./index";
import { registerLive, liveResult } from "./adapter";
import { createSheet, setCell, getValue } from "../sheet";

describe("sparklineSvg", () => {
  it("renders a polyline svg using accent var", () => {
    const s = sparklineSvg([1, 3, 2]);
    expect(s).toMatch(/^<svg /);
    expect(s).toContain("<polyline");
    expect(s).toContain("var(--c-accent");
    expect(s).not.toMatch(/NaN|Infinity/);
  });
  it("handles empty, single, NaN, constant, negatives", () => {
    for (const v of [[], [5], [NaN, 1, NaN], [2, 2, 2], [-3, -1, -2]]) {
      const s = sparklineSvg(v);
      expect(s).toMatch(/^<svg .*<\/svg>$/);
      expect(s).not.toMatch(/NaN|Infinity/);
    }
  });
  it("honours width/height opts", () => {
    expect(sparklineSvg([1, 2], { width: 50, height: 10 })).toContain('width="50"');
  });
});

describe("barSvg", () => {
  it("renders one rect per finite value", () => {
    expect((barSvg([1, 2, 3]).match(/<rect/g) ?? []).length).toBe(3);
    expect((barSvg([1, NaN, 3]).match(/<rect/g) ?? []).length).toBe(2);
  });
  it("handles empty, constant, negatives without NaN", () => {
    for (const v of [[], [4, 4], [-2, 3, -1], [0, 0]]) {
      expect(barSvg(v)).not.toMatch(/NaN|Infinity/);
    }
  });
});

describe("trendInfo", () => {
  it("up/down/flat with pct", () => {
    expect(trendInfo([100, 150])).toMatchObject({ direction: "up", pct: 50 });
    expect(trendInfo([200, 100])).toMatchObject({ direction: "down", pct: -50 });
    expect(trendInfo([3, 3])).toMatchObject({ direction: "flat", pct: 0 });
  });
  it("edge cases", () => {
    expect(trendInfo([]).direction).toBe("flat");
    expect(trendInfo([7]).direction).toBe("flat");
    expect(trendInfo([0, 5]).direction).toBe("up");
    expect(Number.isFinite(trendInfo([0, 5]).pct)).toBe(true);
    expect(trendInfo([NaN, 10, 20]).pct).toBe(100);
    expect(trendInfo([-100, -50]).direction).toBe("up");
  });
  it("label has sign and %", () => {
    expect(trendInfo([100, 150]).label).toBe("▲ +50%");
    expect(trendInfo([200, 100]).label).toBe("▼ -50%");
    expect(trendInfo([1, 1]).label).toBe("▶ 0%");
  });
});

describe("trendHtml / liveFunctions", () => {
  it("colours by direction", () => {
    expect(trendHtml([1, 2])).toContain("var(--c-success");
    expect(trendHtml([2, 1])).toContain("var(--c-error");
  });
  it("registers three html functions", () => {
    for (const k of ["SPARKLINE", "BAR", "TREND"] as const) {
      const r = liveFunctions[k]([1, 2, 3]);
      expect(r.kind).toBe("html");
      expect(r.html.length).toBeGreaterThan(0);
    }
  });
});

describe("live functions nested in formulas", () => {
  const mk = () => {
    registerLive();
    const s = createSheet();
    [10, 20, 30].forEach((v, i) => setCell(s, `A${i + 1}`, String(v)));
    return s;
  };
  it("nested SPARKLINE/BAR/TREND return fallback text without error", () => {
    const s = mk();
    setCell(s, "B1", '="x"&SPARKLINE(A1:A3)&"y"');
    setCell(s, "B2", '=IF(1,TREND(A1:A3),"no")');
    setCell(s, "B3", '="b"&BAR(A1:A3)');
    expect(getValue(s, "B1")).toBe("xy");
    expect(getValue(s, "B2")).toBe(trendInfo([10, 20, 30]).label);
    expect(getValue(s, "B3")).toBe("b");
  });
  it("liveResult stays correct for whole-cell and null when nested", () => {
    const r = () => [10, 20, 30];
    expect(liveResult("=SPARKLINE(A1:A3)", r)).toMatchObject({ kind: "html" });
    expect(liveResult('="x"&SPARKLINE(A1:A3)', r)).toBeNull();
  });
});
