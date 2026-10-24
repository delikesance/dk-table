import { test, expect, type Page } from "@playwright/test";
import { openApp, selectCell, typeInCell, cellText } from "./helpers";
import { activeKey, gotoCell } from "./helpers-edit";

/** E2E virtualized grid: reach A500, edit it, DOM stays small, value survives scrolling away and back. */
test.beforeEach(async ({ page }) => { await openApp(page); });

const renderedRows = (page: Page) => page.locator(".dkg-rowh").count();
const hasCell = (page: Page, k: string) => page.locator(`.dkg-cell[data-key="${k}"]`);

test("only a window of rows is in the DOM initially", async ({ page }) => {
  const n = await renderedRows(page);
  expect(n).toBeGreaterThan(5);
  expect(n).toBeLessThanOrEqual(60);
  await expect(hasCell(page, "A500")).toHaveCount(0);
});

test("jump to A500, type a value, DOM stays small and top rows are unmounted", async ({ page }) => {
  await gotoCell(page, "A500");
  expect(await activeKey(page)).toBe("A500");
  await page.keyboard.type("hello500");
  await page.keyboard.press("Enter");
  expect(await cellText(page, "A500")).toBe("hello500");
  expect(await renderedRows(page)).toBeLessThanOrEqual(60);
  await expect(hasCell(page, "A1")).toHaveCount(0);
});

test("Ctrl+ArrowDown from A1 reaches the last row", async ({ page }) => {
  await selectCell(page, "A1");
  await page.keyboard.press("Control+ArrowDown");
  expect(Number((await activeKey(page))!.slice(1))).toBeGreaterThan(500);
  expect(await renderedRows(page)).toBeLessThanOrEqual(60);
});

test("value typed at A500 persists after scrolling to the top and back", async ({ page }) => {
  await gotoCell(page, "A500");
  await page.keyboard.type("far");
  await page.keyboard.press("Enter");
  await page.locator(".dkg").evaluate((el) => { el.scrollTop = 0; });
  await expect(hasCell(page, "A1")).toHaveCount(1);
  await expect(hasCell(page, "A500")).toHaveCount(0);
  await page.locator(".dkg").evaluate((el) => { el.scrollTop = 499 * 28; });
  await expect(hasCell(page, "A500")).toHaveCount(1);
  expect(await cellText(page, "A500")).toBe("far");
});

test("a value typed at the top is still there after visiting the bottom", async ({ page }) => {
  await typeInCell(page, "A1", "top");
  await gotoCell(page, "A900");
  await gotoCell(page, "A1");
  expect(await cellText(page, "A1")).toBe("top");
  expect(await renderedRows(page)).toBeLessThanOrEqual(60);
});

test("a formula far down recalculates from a distant precedent", async ({ page }) => {
  await typeInCell(page, "A1", "4");
  await gotoCell(page, "B400");
  await page.keyboard.type("=A1*5");
  await page.keyboard.press("Enter");
  expect(await cellText(page, "B400")).toBe("20");
  await gotoCell(page, "A1");
  await page.keyboard.type("6");
  await page.keyboard.press("Enter");
  await gotoCell(page, "B400");
  expect(await cellText(page, "B400")).toBe("30");
});
