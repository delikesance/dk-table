/** E2E: Données > Texte en colonnes (dialogue + résultat) et plafond de cellule (toast), thèmes clair et sombre, avec captures. */
import { test, expect } from "@playwright/test";
import { openApp, typeInCell, cellText, selectCell } from "./helpers";

test.use({ viewport: { width: 1200, height: 800 } });

for (const theme of ["clair", "sombre"] as const) {
  test(`texte en colonnes (${theme})`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem("dk-theme", t === "clair" ? "light" : "dark"), theme);
    await openApp(page);
    for (const [i, v] of ["Ana;12;Paris", "Luc;30;Lyon", "Zoé;8;Nice"].entries()) await typeInCell(page, `A${i + 1}`, v);
    await selectCell(page, "A1");
    await page.keyboard.press("Shift+Control+ArrowDown");
    await page.locator('.dk-menu__trigger[title="Menu Données"]').click();
    await page.getByText("Texte en colonnes…").click();
    const d = page.locator('.dk-dialog[data-id="text-to-columns"]');
    await d.locator('input[name="comma"]').uncheck();
    await d.locator('input[name="semi"]').check();
    await page.screenshot({ path: `docs/screenshots/texte-en-colonnes/dialogue-${theme}.png` });
    await d.locator('[data-action="apply"]').click();
    expect(await cellText(page, "B2")).toBe("30");
    expect(await cellText(page, "C3")).toBe("Nice");
    await page.screenshot({ path: `docs/screenshots/texte-en-colonnes/resultat-${theme}.png` });
  });

  test(`plafond cellule > 50 000 caractères (${theme})`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem("dk-theme", t === "clair" ? "light" : "dark"), theme);
    await openApp(page);
    await selectCell(page, "A1");
    await page.keyboard.press("F2");
    await page.locator(".dkg-editor").fill("x".repeat(50_001));
    await page.keyboard.press("Enter");
    await expect(page.locator(".dk-toast")).toContainText("50");
    await page.screenshot({ path: `docs/screenshots/plafonds-google-sheets/toast-cellule-${theme}.png` });
  });
}
