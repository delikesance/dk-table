/** E2E: listes personnalisées (Paramètres > Listes personnalisées…): ajout, refus d'un doublon, suppression, captures dans docs/screenshots/listes-personnalisees-de-tri-et-de-recopie/. */
import { test, expect } from "@playwright/test";
import { openApp } from "./helpers";

test.use({ viewport: { width: 1200, height: 800 } });

const SHOTS = "docs/screenshots/listes-personnalisees-de-tri-et-de-recopie";
const dialog = '[data-id="customLists"]';

for (const theme of ["clair", "sombre"] as const) {
  const suffix = theme === "clair" ? "clair" : "sombre";
  test.describe(`listes personnalisées (${theme})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((t) => {
        localStorage.setItem("dk-theme", t === "sombre" ? "dark" : "light");
        localStorage.removeItem("dk-table.customLists");
      }, theme);
      await openApp(page);
      await page.keyboard.press("Control+,");
      await page.locator('[data-action="lists"]').click();
    });

    test("ajoute une liste, puis refuse un doublon", async ({ page }) => {
      const area = page.locator(`${dialog} textarea[name="items"]`);
      await area.fill("Bas\nMoyen\nHaut");
      await page.locator(`${dialog} button[data-action="add"]`).click();
      await expect(page.locator(`${dialog} [data-role="lists"]`)).toContainText("Bas, Moyen, Haut");
      await page.screenshot({ path: `${SHOTS}/liste-ajoutee-${suffix}.png` });

      await area.fill("haut, bas, moyen, moyen");
      await page.locator(`${dialog} button[data-action="add"]`).click();
      await expect(page.locator(`${dialog} [role="alert"]`)).toContainText("double");
      await page.screenshot({ path: `${SHOTS}/refus-doublon-${suffix}.png` });

      await page.locator(`${dialog} button[data-action="remove"][data-index="0"]`).click();
      await expect(page.locator(`${dialog} [data-role="lists"]`)).not.toContainText("Bas");
      await page.screenshot({ path: `${SHOTS}/liste-supprimee-${suffix}.png` });
    });
  });
}
