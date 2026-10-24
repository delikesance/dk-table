import { expect, test } from "@playwright/test";
import { cellText, openApp, selectCell } from "./helpers";

/** Function autocompletion after "=" in the cell editor and the formula bar. */
test.beforeEach(async ({ page }) => openApp(page));

test("cell: = lists functions, arrows + Enter insert, formula computes", async ({ page }) => {
  await selectCell(page, "A1"); await page.keyboard.type("4"); await page.keyboard.press("Enter");
  await selectCell(page, "B1");
  await page.keyboard.type("=SQ");
  const pop = page.locator(".dk-fnpop");
  await expect(pop).toBeVisible();
  await expect(pop.locator(".dk-fnpop__item--selected .dk-fnpop__name")).toHaveText("SQRT");
  await page.keyboard.press("Enter");
  await expect(page.locator(".dkg-editor")).toHaveValue("=SQRT(");
  await expect(pop.locator(".dk-fnpop__arg--on")).toHaveText("x");
  await page.keyboard.type("A1)");
  await page.keyboard.press("Enter");
  expect(await cellText(page, "B1")).toBe("2");
});

test("formula bar: Tab inserts the selected function", async ({ page }) => {
  await selectCell(page, "C2");
  await page.locator(".dk-formula__input").click();
  await page.keyboard.type("=ro");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Tab");
  await expect(page.locator(".dk-formula__input")).toHaveValue("=ROUNDDOWN(");
});
