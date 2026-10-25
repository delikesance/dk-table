/** Atteindre spécial (Ctrl+G) : boîte de choix, sélection des formules, captures clair + sombre. */
import { test, expect } from "@playwright/test";
import { openApp, typeInCell } from "./helpers";

test.use({ viewport: { width: 1200, height: 800 } });

const DIR = "docs/screenshots/atteindre-special-go-to-special";
const DATA: Record<string, string> = {
  A1: "Produit", B1: "Prix", C1: "Qté", D1: "Total",
  A2: "Stylo", B2: "1200", C2: "3", D2: "=B2*C2",
  A3: "Cahier", B3: "850", C3: "4", D3: "=B3*C3",
  A4: "Règle", B4: "940", C4: "2", D4: "1880",
  A5: "Total", D5: "=SUM(D2:D4)",
};

for (const [theme, label] of [["light", "clair"], ["dark", "sombre"]] as const) {
  test(`atteindre spécial (${label})`, async ({ page }) => {
    await openApp(page);
    await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
    for (const [k, v] of Object.entries(DATA)) await typeInCell(page, k, v);
    await page.locator(".dkg-cell[data-key='A1']").click();
    await page.keyboard.press("Control+g");
    const box = page.locator('.dk-dialog[data-id="special"]');
    await expect(box).toBeVisible();
    await box.locator("label", { hasText: "Formules" }).click();
    await page.screenshot({ path: `${DIR}/dialogue-${label}.png` });
    await box.locator("button[type=submit]").click();
    await expect(box).toHaveCount(0);
    await expect(page.locator(".dkg-special")).toHaveCount(3);
    await expect(page.locator(".dkg-cell[data-key='D2']")).toHaveClass(/dkg-active/);
    await page.screenshot({ path: `${DIR}/resultat-${label}.png` });
  });
}
