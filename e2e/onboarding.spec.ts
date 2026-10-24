import { test, expect } from "@playwright/test";
import { cell } from "./helpers";

/** Home screen shown at launch: lists sheets, "Créer" adds one and enters the grid. */
test("onboarding lists projects and Créer enters the grid", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('.ob [data-sheet]')).toHaveCount(1);
  await page.locator('.ob [data-action="create"]').click();
  await expect(page.locator(".ob")).toHaveCount(0);
  await expect(page.locator(".dk-tab:not(.dk-tab--add)")).toHaveCount(2);
  await cell(page, "A1").click();
});
