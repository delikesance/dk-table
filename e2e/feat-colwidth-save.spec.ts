/** E2E: resized / fitted column widths are written to the .dktable file and restored by "Ouvrir". */
import { test, expect, type Page } from "@playwright/test";
import { openApp, cell, typeInCell } from "./helpers";
import { mockFiles } from "./helpers-edit";

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

test("resized and fitted widths survive a save / open round-trip, and one undo reverts a resize", async ({ page }) => {
  await mockFiles(page);
  await openApp(page);
  await typeInCell(page, "B1", "a very long piece of text in this cell");
  await drag(page, 60);
  await page.locator(".dkg-resizer").nth(1).dblclick();
  const [wa, wb] = [await width(page, "A1"), await width(page, "B1")];
  await page.locator(".dkg").focus();
  await page.keyboard.press("Control+s");
  await expect.poll(() => page.evaluate(() => Object.keys((window as unknown as { __files: object }).__files).length)).toBe(1);
  const saved = await page.evaluate(() => Object.values((window as unknown as { __files: Record<string, string> }).__files)[0]);
  expect(Object.keys(JSON.parse(saved).sheets[0].colWidths)).toEqual(["A", "B"]);
  await page.keyboard.press("Control+z"); // undo the fit, then the resize
  await page.keyboard.press("Control+z");
  expect(Math.abs((await width(page, "A1")) - wa)).toBeGreaterThan(40);
  await page.keyboard.press("Control+o");
  await expect.poll(async () => Math.round(await width(page, "B1"))).toBe(Math.round(wb));
  expect(Math.round(await width(page, "A1"))).toBe(Math.round(wa));
});
