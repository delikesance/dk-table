/** E2E: fill down (Ctrl+D) / right (Ctrl+R) over a selection; formulas adjust; one Ctrl+Z undoes. */
import { test, expect } from "@playwright/test";
import { openApp, typeInCell, cellText } from "./helpers";
import { selectRange } from "./helpers-edit";
import { fillColumn, readColumn } from "./helpers-new";

test.beforeEach(async ({ page }) => { await openApp(page); });

test("Ctrl+D copies the first row of the selection downwards", async ({ page }) => {
  await typeInCell(page, "A1", "5");
  await selectRange(page, "A1", "A3");
  await page.keyboard.press("Control+d");
  expect(await readColumn(page, "A", 3)).toEqual(["5", "5", "5"]);
});

// Known limitation (src/ui/grid/fill.ts): formulas are copied as-is, relative refs are not shifted.
test.fixme("Ctrl+D shifts relative references of formulas", async ({ page }) => {
  await fillColumn(page, "A", ["1", "2", "3"]);
  await typeInCell(page, "B1", "=A1*10");
  await selectRange(page, "B1", "B3");
  await page.keyboard.press("Control+d");
  expect(await readColumn(page, "B", 3)).toEqual(["10", "20", "30"]);
});

test("Ctrl+R copies the first column of the selection to the right", async ({ page }) => {
  await typeInCell(page, "A1", "7");
  await selectRange(page, "A1", "C1");
  await page.keyboard.press("Control+r");
  expect([await cellText(page, "B1"), await cellText(page, "C1")]).toEqual(["7", "7"]);
});

test("a fill is undone by a single Ctrl+Z", async ({ page }) => {
  await typeInCell(page, "A1", "5");
  await selectRange(page, "A1", "A4");
  await page.keyboard.press("Control+d");
  expect(await cellText(page, "A4")).toBe("5");
  await page.keyboard.press("Control+z");
  expect(await readColumn(page, "A", 4)).toEqual(["5", "", "", ""]);
});
