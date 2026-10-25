/** Panneau « Qui utilise cette cellule ? » (palette) : captures clair + sombre, navigation au clic. */
import { test, expect } from "@playwright/test";
import { openApp, typeInCell, selectCell, cell } from "./helpers";

test.use({ viewport: { width: 1200, height: 800 } });

const DIR = "docs/screenshots/carte-des-dependances-interactive";
const DATA: Record<string, string> = {
  A1: "120", A2: "340", A3: "=SUM(A1:A2)", B1: "=A3*0,2", B2: "=A3-B1", C1: "=SPARKLINE(A1:A2)",
};

for (const [theme, label] of [["light", "clair"], ["dark", "sombre"]] as const) {
  test(`carte des dépendances (${label})`, async ({ page }) => {
    await openApp(page);
    await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
    for (const [k, v] of Object.entries(DATA)) await typeInCell(page, k, v.replace("0,2", "0.2"));
    await selectCell(page, "A3");
    await page.keyboard.press("Control+k");
    await page.keyboard.type("Qui utilise");
    await page.keyboard.press("Enter");
    await expect(page.locator(".dk-dep__link").first()).toBeVisible();
    await expect(page.locator(".dk-dep__link", { hasText: "!A1" })).toBeVisible();
    await expect(page.locator(".dk-dep__link", { hasText: "!B1" })).toBeVisible();
    await page.screenshot({ path: `${DIR}/panneau-${label}.png` });
    await page.locator(".dk-dep__link", { hasText: "!B2" }).click();
    await expect(cell(page, "B2")).toHaveClass(/sel|active/);
    await page.screenshot({ path: `${DIR}/navigation-${label}.png` });
  });
}
