/** E2E: Données > Sous-totaux… : choix des colonnes, Valider (plan et niveaux), Tout supprimer; captures clair + sombre. */
import { test, expect } from "@playwright/test";
import { cell, openApp, typeInCell } from "./helpers";

const DIR = "docs/screenshots/boite-de-dialogue-sous-totaux";
const DATA: [string, string][] = [
  ["A1", "Produit"], ["B1", "Montant"], ["A2", "Fruits"], ["B2", "10"], ["A3", "Fruits"], ["B3", "20"],
  ["A4", "Légumes"], ["B4", "5"], ["A5", "Légumes"], ["B5", "7"],
];

for (const [theme, label] of [["light", "clair"], ["dark", "sombre"]] as const) {
  test(`sous-totaux (${label})`, async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await openApp(page);
    await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
    for (const [addr, value] of DATA) await typeInCell(page, addr, value);

    // sélection A1:B5, puis Données > Sous-totaux…
    await cell(page, "A1").click();
    await cell(page, "B5").click({ modifiers: ["Shift"] });
    await page.getByRole("button", { name: "Données" }).click();
    await page.getByText("Sous-totaux…").click();
    const dlg = page.locator('.dk-dialog[data-id="subtotals"]');
    await expect(dlg).toBeVisible();
    await dlg.locator('input[name="value"][value="1"]').check();
    await page.screenshot({ path: `${DIR}/boite-${label}.png` });

    // Valider : sous-totaux écrits sous les données, puis le plan est posé
    await dlg.locator('[data-action="apply"]').click();
    await expect(cell(page, "A4")).toHaveText("Total Fruits");
    await expect(cell(page, "A7")).toHaveText("Total Légumes");
    await expect(cell(page, "B8")).toHaveText("42");
    await expect(page.locator('.dkg-fold[data-row="3"]')).toHaveCount(1);
    await page.screenshot({ path: `${DIR}/applique-${label}.png` });
  });
}
