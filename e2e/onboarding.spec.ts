import { test, expect } from "@playwright/test";
import { cell } from "./helpers";

/** Accueil au lancement : trois actions + Atlas ; « Nouveau classeur » ferme l'accueil et rend la main à la grille. */
test("l'accueil propose Nouveau / Ouvrir / Importer et l'Atlas", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('.ob [data-action]')).toHaveText([/Nouveau classeur/, /Ouvrir/, /Importer CSV/]);
  await expect(page.locator(".ob .dk-art__img--light")).toBeVisible();
  await page.locator('.ob [data-action="new"]').click();
  await expect(page.locator(".ob")).toHaveCount(0);
  await cell(page, "A1").click();
});
