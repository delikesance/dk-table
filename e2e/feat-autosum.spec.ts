/** E2E: quick sum (toolbar Σ and Alt+=) writes =SUM over the numbers above, else to the left. */
import { test, expect } from "@playwright/test";
import { openApp, selectCell, cellText, typeInCell } from "./helpers";
import { fx } from "./helpers-edit";
import { fillColumn } from "./helpers-new";

test.beforeEach(async ({ page }) => { await openApp(page); });

test("the Σ button sums the column above the active cell", async ({ page }) => {
  await fillColumn(page, "A", ["1", "2", "3"]);
  await selectCell(page, "A4");
  await page.getByRole("button", { name: "Somme rapide (Alt+=)" }).click();
  expect(await cellText(page, "A4")).toBe("6");
  await selectCell(page, "A4");
  await expect(fx(page)).toHaveValue("=SUM(A1:A3)");
});

test("Alt+= sums the row to the left when nothing is above", async ({ page }) => {
  await typeInCell(page, "A2", "4");
  await typeInCell(page, "B2", "5");
  await selectCell(page, "C2");
  await page.keyboard.press("Alt+Equal");
  await expect.poll(() => cellText(page, "C2")).toBe("9");
});

test("Alt+= does nothing without numeric neighbours", async ({ page }) => {
  await selectCell(page, "B5");
  await page.keyboard.press("Alt+Equal");
  expect(await cellText(page, "B5")).toBe("");
});
