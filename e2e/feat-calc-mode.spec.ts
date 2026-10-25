/** E2E: calcul manuel (Paramètres > Calcul manuel, F9) and iterative references, with screenshots in docs/screenshots/mode-de-calcul-manuel-et-iteratif/. */
import { test, expect, type Page } from "@playwright/test";
import { cell, cellText, openApp, typeInCell } from "./helpers";

test.use({ viewport: { width: 1200, height: 800 } });

const SHOTS = "docs/screenshots/mode-de-calcul-manuel-et-iteratif";

/** Toggle a Paramètres checkbox by its input name. */
async function setSetting(page: Page, name: string, on: boolean): Promise<void> {
  await page.keyboard.press("Control+,");
  const box = page.locator(`input[name="${name}"]`);
  await box.setChecked(on);
  await page.keyboard.press("Escape");
}

for (const theme of ["clair", "sombre"] as const) {
  test.describe(`mode de calcul (${theme})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem("dk-theme", t === "sombre" ? "dark" : "light"), theme);
      await openApp(page);
      await typeInCell(page, "A1", "1");
      await typeInCell(page, "B1", "=A1*2");
    });

    test("manuel: une édition ne recalcule pas les dépendants avant F9", async ({ page }) => {
      await setSetting(page, "manual", true);
      await typeInCell(page, "A1", "5");
      expect(await cellText(page, "B1")).toBe("2");
      await page.screenshot({ path: `${SHOTS}/manuel-avant-f9-${theme === "clair" ? "clair" : "sombre"}.png` });
      await page.keyboard.press("F9");
      expect(await cellText(page, "B1")).toBe("10");
      await page.screenshot({ path: `${SHOTS}/manuel-apres-f9-${theme === "clair" ? "clair" : "sombre"}.png` });
    });

    test("itératif: une référence circulaire converge au lieu de #CYCLE!", async ({ page }) => {
      await setSetting(page, "iterative", true);
      await typeInCell(page, "A2", "=1+B2*0.5");
      await typeInCell(page, "B2", "=A2*0.5");
      expect(Number(await cellText(page, "A2"))).toBeCloseTo(4 / 3, 2);
      await expect(cell(page, "A2")).not.toHaveText("#CYCLE!");
      await page.screenshot({ path: `${SHOTS}/iteratif-convergence-${theme === "clair" ? "clair" : "sombre"}.png` });
    });
  });
}
