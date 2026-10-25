/** E2E: right-click on a multi-selection keeps it and the menu actions apply to all of it. */
import { test, expect } from "@playwright/test";
import { openApp, typeInCell, cell, cellText } from "./helpers";

const item = (page: import("@playwright/test").Page, label: string) =>
  page.locator("body > .dk-menu .dk-menu__item", { hasText: label }).first();

test.beforeEach(async ({ page }) => {
  await openApp(page);
  for (const [k, v] of [["A1", "1"], ["B1", "2"], ["A2", "3"], ["B2", "4"]]) await typeInCell(page, k, v);
});

test("right-click inside a cell range keeps it; Effacer le contenu clears the whole range", async ({ page }) => {
  await cell(page, "A1").click();
  await cell(page, "B2").click({ modifiers: ["Shift"] });
  await cell(page, "B1").click({ button: "right" });
  await expect(cell(page, "A2")).toHaveClass(/dkg-range/);
  await item(page, "Effacer le contenu").click();
  expect([await cellText(page, "A1"), await cellText(page, "B1"), await cellText(page, "A2"), await cellText(page, "B2")]).toEqual(["", "", "", ""]);
});

test("right-click inside a multi-column header selection keeps it; bold applies to all of it", async ({ page }) => {
  await page.locator('.dkg-colh[data-col="0"]').click();
  await page.locator('.dkg-colh[data-col="1"]').click({ modifiers: ["Shift"] });
  await cell(page, "B2").click({ button: "right" });
  await item(page, "Gras").click();
  for (const k of ["A1", "B1", "A9"]) expect(await cell(page, k).evaluate((e) => getComputedStyle(e).fontWeight)).toBe("700");
});

test("right-click outside the range selects the clicked cell only", async ({ page }) => {
  await cell(page, "A1").click();
  await cell(page, "B2").click({ modifiers: ["Shift"] });
  await cell(page, "D5").click({ button: "right" });
  await expect(cell(page, "A2")).not.toHaveClass(/dkg-range/);
  await expect(cell(page, "D5")).toHaveClass(/dkg-active/);
});
