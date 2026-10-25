/** E2E: grid headers are opaque (tinted background, also when selected): scrolled cells never show through. */
import { test, expect, type Page } from "@playwright/test";
import { openApp, typeInCell } from "./helpers";

const bg = (page: Page, sel: string) => page.locator(sel).first().evaluate((e) => getComputedStyle(e).backgroundColor);

test("headers, row headers and corner have a background different from the cells", async ({ page }) => {
  await openApp(page);
  const cell = await bg(page, ".dkg-cell");
  for (const sel of [".dkg-colh", ".dkg-rowh", ".dkg-corner"]) {
    const h = await bg(page, sel);
    expect(h).not.toBe("rgba(0, 0, 0, 0)");
    expect(h).not.toBe(cell);
  }
});

test("selected column headers stay opaque while data scrolls under them", async ({ page }) => {
  await openApp(page);
  await typeInCell(page, "D2", "2025-01-24 11:51:34");
  await typeInCell(page, "E2", "Amazon");
  await page.locator('.dkg-colh[data-col="3"]').click();
  await page.locator('.dkg-colh[data-col="4"]').click({ modifiers: ["Shift"] });
  // put row 2 under the header band: scroll by a few px
  await page.locator(".dkg").evaluate((e) => { e.scrollTop = 20; });
  const top = await page.locator('.dkg-colh[data-col="3"]').evaluate((e) => {
    const r = e.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return hit === e || e.contains(hit);
  });
  expect(top).toBe(true);
  expect(await page.locator('.dkg-colh[data-col="3"]').evaluate((e) => getComputedStyle(e).backgroundImage)).toContain("linear-gradient");
  await page.screenshot({ path: "/tmp/claude-0/shots/headers-bg.png", clip: { x: 0, y: 120, width: 1000, height: 120 } });
});
