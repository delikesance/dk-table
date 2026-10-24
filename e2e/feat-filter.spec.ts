/** E2E (row 1 = header row, not filtered): column filter: header button opens a popover of distinct values; unchecked values hide rows; "Effacer le filtre" restores. */
import { test, expect, type Page } from "@playwright/test";
import { openApp, cell } from "./helpers";
import { fillColumn } from "./helpers-new";

test.beforeEach(async ({ page }) => {
  await openApp(page);
  await fillColumn(page, "A", ["h", "a", "b", "a", "c"]);
});

const open = (page: Page) => page.getByRole("button", { name: /Filtrer la colonne A/ }).click();

test("popover lists the distinct values with counts", async ({ page }) => {
  await open(page);
  const pop = page.locator(".dkg-pop");
  await expect(pop).toBeVisible();
  await expect(pop.locator("input[type=checkbox]")).toHaveCount(4); // a, b, c + the empty rows
  await expect(pop.locator("label", { hasText: "a" }).locator(".dkg-pop__n")).toHaveText("2");
});

test("unchecking a value hides its rows; Effacer le filtre brings them back", async ({ page }) => {
  await open(page);
  await page.locator('.dkg-pop input[data-v="a"]').uncheck();
  await page.locator('.dkg-pop [data-act="ok"]').click();
  await expect(cell(page, "A2")).toBeHidden();
  await expect(cell(page, "A4")).toBeHidden();
  await expect(cell(page, "A3")).toBeVisible();
  await expect(cell(page, "A1")).toBeVisible(); // header row stays
  await open(page);
  await page.locator('.dkg-pop [data-act="clear"]').click();
  await expect(cell(page, "A2")).toBeVisible();
  await expect(cell(page, "A4")).toBeVisible();
});
