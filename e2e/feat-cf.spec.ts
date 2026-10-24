/** Formatage conditionnel : Format > Formatage conditionnel…, règle sur la sélection, recalcul à l'édition. */
import { test, expect } from "@playwright/test";
import { cell, openApp, typeInCell } from "./helpers";

test.beforeEach(async ({ page }) => { await openApp(page); });

test("a « greater than » rule colors matching cells and follows edits", async ({ page }) => {
  for (const [i, v] of ["10", "30", "50"].entries()) await typeInCell(page, `A${i + 1}`, v);
  await cell(page, "A1").click();
  await cell(page, "A3").click({ modifiers: ["Shift"] });
  await page.locator(".dk-menu__trigger", { hasText: "Format" }).click();
  await page.locator(".dk-menu__item", { hasText: "Formatage conditionnel" }).click();
  await page.getByRole("button", { name: "Nouvelle règle" }).click();
  await expect(page.locator('.dk-cf__form [name="range"]')).toHaveValue("A1:A3");
  await page.locator('.dk-cf__form [name="a"]').fill("20");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.locator(".dk-cf__item")).toHaveCount(1);
  await page.screenshot({ path: process.env.CF_SHOT ?? "test-results/cf-dialog.png" });
  await page.getByRole("button", { name: "Fermer" }).click();
  await expect(cell(page, "A3")).toHaveCSS("background-color", "rgb(253, 226, 224)");
  await expect(cell(page, "A1")).not.toHaveCSS("background-color", "rgb(253, 226, 224)");
  await typeInCell(page, "A1", "99");
  await expect(cell(page, "A1")).toHaveCSS("background-color", "rgb(253, 226, 224)");
});
