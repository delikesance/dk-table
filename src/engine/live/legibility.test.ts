import { describe, it, expect } from "vitest";
import { sparklineSvg, barSvg, trendHtml } from "./index";

describe("live legibility", () => {
  it("sparkline stroke >= 2", () => expect(sparklineSvg([1, 2, 3])).toMatch(/stroke-width="2(\.\d+)?"/));
  it("bars keep a >=2px gap", () => {
    const xw = [...barSvg([1, 2, 3, 4]).matchAll(/<rect x="([\d.]+)"[^>]*width="([\d.]+)"/g)].map((m) => [Number(m[1]), Number(m[2])]);
    expect(xw[1][0] - (xw[0][0] + xw[0][1])).toBeGreaterThanOrEqual(1.99);
  });
  it("trend carries signed label and a title", () => {
    expect(trendHtml([100, 150])).toMatch(/title="Hausse de 50 %"/);
    expect(trendHtml([200, 100])).toMatch(/title="Baisse de 50 %"/);
  });
});
