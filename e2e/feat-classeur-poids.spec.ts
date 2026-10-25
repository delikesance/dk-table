/** E2E: pas de plafond de lignes (ligne 1500 éditable, aucun toast) et poids du classeur dans la barre d'état; captures clair + sombre. */
import { test, expect } from "@playwright/test";
import { cell, openApp, typeInCell } from "./helpers";
import { gotoCell } from "./helpers-edit";

const DIR = "docs/screenshots/classeur-sans-plafond-avec-limites-visibles";

for (const [theme, label] of [["light", "clair"], ["dark", "sombre"]] as const) {
  test(`classeur sans plafond et poids (${label})`, async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await openApp(page);
    await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
    await typeInCell(page, "A1", "Produit");
    await typeInCell(page, "B1", "42");
    const weight = page.locator(".dk-weight");
    await expect(weight).toContainText("2 cellules");
    await expect(weight).toHaveAttribute("data-level", "leger");
    await page.screenshot({ path: `${DIR}/poids-initial-${label}.png` });

    // la feuille a 1000 lignes : écrire en A1000 l'agrandit (réserve d'un bloc), puis A1500 devient accessible
    await gotoCell(page, "A1000");
    await page.keyboard.type("bas");
    await page.keyboard.press("Enter");
    await gotoCell(page, "A1500");
    await page.keyboard.type("fin");
    await page.keyboard.press("Enter");
    await expect(cell(page, "A1500")).toHaveText("fin");
    await expect(page.locator(".dk-toast")).toHaveCount(0);
    await expect(weight).toContainText("4 cellules");
    await page.screenshot({ path: `${DIR}/ligne-1500-${label}.png` });
  });
}
