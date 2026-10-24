/** E2E: dragging the column-header handle changes the column width; double-click fits to content. */
import { test, expect, type Page } from "@playwright/test";
import { openApp, cell, typeInCell } from "./helpers";

test.beforeEach(async ({ page }) => { await openApp(page); });

const width = async (page: Page, key: string) => (await cell(page, key).boundingBox())!.width;

/** Drag the handle of the first column by `dx` px. */
async function drag(page: Page, dx: number): Promise<void> {
  const b = (await page.locator(".dkg-resizer").first().boundingBox())!;
  const [x, y] = [b.x + b.width / 2, b.y + b.height / 2];
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y, { steps: 5 });
  await page.mouse.up();
}

test("dragging the handle of column A widens it, and narrows it back", async ({ page }) => {
  const w0 = await width(page, "A1");
  const wb = await width(page, "B1");
  await drag(page, 60);
  const w1 = await width(page, "A1");
  expect(w1).toBeGreaterThan(w0 + 40);
  expect(Math.abs((await width(page, "B1")) - wb)).toBeLessThan(2); // neighbours untouched
  await drag(page, -40);
  expect(await width(page, "A1")).toBeLessThan(w1 - 30);
});

test("double-click on the handle fits the column to a long text", async ({ page }) => {
  await typeInCell(page, "A1", "a very long piece of text in this cell");
  const w0 = await width(page, "A1");
  await page.locator(".dkg-resizer").first().dblclick();
  expect(await width(page, "A1")).toBeGreaterThan(w0);
});
