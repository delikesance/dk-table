/** Scroll position is independent per sheet; screenshots in docs/screenshots/scroll-par-feuille/ (SHOTS=suffix). */
import { expect, test } from "@playwright/test";
import { cell, openApp, typeInCell } from "./helpers";

const top = (page: import("@playwright/test").Page) => page.locator(".dkg").evaluate((el) => el.scrollTop);
const shot = async (page: import("@playwright/test").Page, name: string) => {
  const s = process.env.SHOTS;
  if (s) await page.screenshot({ path: `docs/screenshots/scroll-par-feuille/${name}-${s}.png` });
};

test("each sheet keeps its own scroll position", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 800 });
  await openApp(page);
  await typeInCell(page, "A1", "Feuille 1 - haut");
  await page.locator(".dkg").evaluate((el) => (el.scrollTop = 1200));
  await page.waitForTimeout(100);
  const first = await top(page);
  expect(first).toBeGreaterThan(0);
  await shot(page, "feuille1-defilee");
  await page.getByLabel("Ajouter une feuille").click();
  await expect(cell(page, "A1")).toBeVisible();
  expect(await top(page)).toBe(0);
  
  await page.locator(".dkg").evaluate((el) => (el.scrollTop = 400));
  await page.locator(".dk-tab:not(.dk-tab--add)").first().click();
  await page.waitForTimeout(100);
  await shot(page, "retour-feuille1");
  expect(await top(page)).toBe(first);
});
