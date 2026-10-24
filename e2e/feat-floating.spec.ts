/** E2E: the floating mini-bar appears on a multi-cell selection only and applies quick formats. */
import { test, expect, type Page } from "@playwright/test";
import { openApp, selectCell, typeInCell } from "./helpers";
import { css, selectRange } from "./helpers-edit";

const bar = (page: Page) => page.locator(".dk-floating");

test.beforeEach(async ({ page }) => { await openApp(page); });

test("hidden on a single cell, shown on a range, hidden again on click", async ({ page }) => {
  await selectCell(page, "A1");
  await expect(bar(page)).toBeHidden();
  await selectRange(page, "A1", "B2");
  await expect(bar(page)).toBeVisible();
  await selectCell(page, "C3");
  await expect(bar(page)).toBeHidden();
});

test("Gras on the mini-bar bolds the whole selection", async ({ page }) => {
  await typeInCell(page, "A1", "x");
  await selectRange(page, "A1", "B2");
  await bar(page).getByRole("button", { name: "Gras" }).click();
  for (const k of ["A1", "B1", "A2", "B2"]) expect(await css(page, k, "font-weight")).toBe("700");
});

test("the bar offers the percent format and hides while editing", async ({ page }) => {
  await selectRange(page, "A1", "B2");
  await expect(bar(page).getByRole("button", { name: "Format pourcentage" })).toBeVisible();
  await page.keyboard.press("F2");
  await expect(bar(page)).toBeHidden();
});
