/** E2E: auto-fit of column widths (header border double-click, right-click menus). */
import { test, expect, type Page } from "@playwright/test";
import { openApp, typeInCell, cell } from "./helpers";

const width = async (page: Page, addr: string) => (await cell(page, addr).boundingBox())!.width;

test.beforeEach(async ({ page }) => {
  await openApp(page);
  await typeInCell(page, "B1", "Commission_nette_annuelle");
  await typeInCell(page, "C1", "ok");
});

test("right-click on a column header: fit to content, no text clipped", async ({ page }) => {
  expect(await width(page, "B1")).toBeLessThan(150);
  await page.locator('.dkg-colh[data-col="1"]').click({ button: "right" });
  await page.getByText("Ajuster à la largeur du contenu").click();
  const w = await width(page, "B1");
  expect(w).toBeGreaterThan(150);
  const clipped = await cell(page, "B1").evaluate((e) => e.scrollWidth > e.clientWidth);
  expect(clipped).toBe(false);
  expect(await width(page, "C1")).toBeLessThan(w);
});

test("right-click on a cell fits its column; double-click on the border too", async ({ page }) => {
  await cell(page, "B1").click({ button: "right" });
  await page.getByText("Ajuster à la largeur du contenu").click();
  expect(await width(page, "B1")).toBeGreaterThan(150);
  await page.locator(".dkg-resizer").nth(2).dblclick();
  expect(await width(page, "C1")).toBeLessThan(60);
});
