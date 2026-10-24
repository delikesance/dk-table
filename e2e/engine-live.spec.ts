/**
 * E2E (Chrome headless): live cells. A whole-cell =SPARKLINE|BAR|TREND(range) renders an
 * inline SVG (TREND: styled label span) in the cell and redraws when data changes; nested in a formula, only the
 * text fallback is shown (no SVG).
 */
import { test, expect } from "@playwright/test";
import { cell, cellText, openApp } from "./helpers";
import { fill } from "./helpers-engine";

const data = { A1: "1", A2: "3", A3: "2", A4: "5" };

/** SPARKLINE and BAR draw an SVG; TREND is an arrow + % label in a `.live-trend` span (no SVG). */
const live: [string, string][] = [["SPARKLINE", "svg"], ["BAR", "svg"], ["TREND", "span.live-trend"]];

for (const [fn, sel] of live) {
  test(`live: =${fn}(A1:A4) renders ${sel} that redraws on data change`, async ({ page }) => {
    await openApp(page);
    await fill(page, { ...data, C1: `=${fn}(A1:A4)` });
    const svg = cell(page, "C1").locator(sel);
    await expect(svg).toHaveCount(1);
    const before = await cell(page, "C1").innerHTML();
    await fill(page, { A4: "-9" });
    await expect.poll(() => cell(page, "C1").innerHTML()).not.toBe(before);
    await expect(svg).toHaveCount(1);
    await expect(cell(page, "C1").locator("svg")).toHaveCount(fn === "TREND" ? 0 : 1);
  });
}

test("live: lowercase =sparkline(A1:A4) is still a live cell", async ({ page }) => {
  await openApp(page);
  await fill(page, { ...data, C1: "=sparkline(A1:A4)" });
  await expect(cell(page, "C1").locator("svg")).toHaveCount(1);
});

test("live: TREND nested in a formula shows text fallback, no SVG", async ({ page }) => {
  await openApp(page);
  await fill(page, { A1: "10", A2: "11", C1: '=CONCAT("t:",TREND(A1:A2))' });
  await expect(cell(page, "C1").locator("svg")).toHaveCount(0);
  expect(await cellText(page, "C1")).toMatch(/^t:/);
});

test("live: SPARKLINE nested in a formula gives no SVG", async ({ page }) => {
  await openApp(page);
  await fill(page, { ...data, C1: '=CONCAT("s",SPARKLINE(A1:A4))' });
  await expect(cell(page, "C1").locator("svg")).toHaveCount(0);
  expect(await cellText(page, "C1")).toBe("s");
});

test("live: replacing the formula by a number removes the SVG", async ({ page }) => {
  await openApp(page);
  await fill(page, { ...data, C1: "=BAR(A1:A4)" });
  await expect(cell(page, "C1").locator("svg")).toHaveCount(1);
  await fill(page, { C1: "7" });
  await expect(cell(page, "C1").locator("svg")).toHaveCount(0);
  expect(await cellText(page, "C1")).toBe("7");
});
