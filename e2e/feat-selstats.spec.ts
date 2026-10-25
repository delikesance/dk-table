/** E2E: status bar shows selection statistics for 2+ cells; screenshots light + dark. */
import { test, expect } from "@playwright/test";
import { openApp, selectCell } from "./helpers";
import { fillColumn } from "./helpers-new";

const DIR = "docs/screenshots/statistiques-de-selection-dans-la-barre-d-etat";

for (const [theme, label] of [["light", "clair"], ["dark", "sombre"]] as const) {
  test(`selection statistics (${label})`, async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await openApp(page);
    await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
    await fillColumn(page, "A", ["10", "20", "x", "30"]);
    await selectCell(page, "A1");
    await expect(page.locator(".dk-status [data-stat]")).toHaveCount(0);
    await page.locator('.dkg-cell[data-key="A1"]').hover();
    await page.mouse.down();
    await page.locator('.dkg-cell[data-key="A4"]').hover();
    await page.mouse.up();
    const bar = page.locator(".dk-status");
    await expect(bar.locator('[data-stat="Somme"]')).toContainText("60");
    await expect(bar.locator('[data-stat="Moyenne"]')).toContainText("20");
    await expect(bar.locator('[data-stat="Nb"]')).toContainText("4");
    await bar.locator(".dk-status__btn").click();
    await bar.locator('input[data-stat-opt="Min"]').uncheck();
    await expect(bar.locator('[data-stat="Min"]')).toHaveCount(0);
    await bar.locator('input[data-stat-opt="Min"]').check();
    await expect(bar.locator('[data-stat="Min"]')).toHaveCount(1);
    await page.screenshot({ path: `${DIR}/selection-${label}.png` });
  });
}
