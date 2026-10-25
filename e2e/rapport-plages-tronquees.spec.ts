/** Rapport « plages tronquées » : captures de l'alerte d'audit, clair + sombre. */
import { test, expect } from "@playwright/test";
import { openApp, typeInCell } from "./helpers";

test.use({ viewport: { width: 1200, height: 800 } });

const DIR = "docs/screenshots/plages-tronquees-detectees";
const DATA: Record<string, string> = { A1: "100", A2: "200", A3: "300", A4: "400", C1: "=SUM(A1:A3)" };

for (const [theme, label] of [["light", "clair"], ["dark", "sombre"]] as const) {
  test(`plage tronquée (${label})`, async ({ page }) => {
    await openApp(page);
    await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
    for (const [k, v] of Object.entries(DATA)) await typeInCell(page, k, v);
    await page.keyboard.press("Control+k");
    await page.keyboard.type("Audit de modèle");
    await page.keyboard.press("Enter");
    await expect(page.locator(".dk-audit__link", { hasText: "!C1" }).first()).toBeVisible();
    await expect(page.locator(".dk-audit__fix", { hasText: "Étendre à A4" })).toBeVisible();
    await page.screenshot({ path: `${DIR}/alerte-${label}.png` });
    await page.locator(".dk-audit__fix", { hasText: "Étendre à A4" }).click();
    await expect(page.locator(".dk-audit__link", { hasText: "!C1" })).toHaveCount(0);
    await page.screenshot({ path: `${DIR}/corrige-${label}.png` });
  });
}
