/** Audit de modèle (palette) : captures clair + sombre, navigation au clic. */
import { test, expect } from "@playwright/test";
import { openApp, typeInCell, cell } from "./helpers";

test.use({ viewport: { width: 1200, height: 800 } });

const DIR = "docs/screenshots/audit-de-modele-integre";
const DATA: Record<string, string> = {
  A1: "1200", A2: "850", A3: "940", A4: "1100",
  B1: "=A1*1.2", B2: "=A2*1.2", B3: "=A3*1.5", B4: "=A4*1.2",
  C1: "=SUM(A1:A3)", C2: "=NOW()", D1: "=D2", D2: "=D1",
};

for (const [theme, label] of [["light", "clair"], ["dark", "sombre"]] as const) {
  test(`audit de modèle (${label})`, async ({ page }) => {
    await openApp(page);
    await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
    for (const [k, v] of Object.entries(DATA)) await typeInCell(page, k, v);
    await page.keyboard.press("Control+k");
    await page.keyboard.type("Audit de modèle");
    await page.keyboard.press("Enter");
    await expect(page.locator(".dk-audit__link", { hasText: "!B3" }).first()).toBeVisible();
    await expect(page.locator(".dk-audit__link", { hasText: "!C1" })).toBeVisible();
    await page.screenshot({ path: `${DIR}/panneau-${label}.png` });
    await page.locator(".dk-audit__link", { hasText: "!B3" }).first().click();
    await expect(cell(page, "B3")).toHaveClass(/sel|active/);
  });
}
