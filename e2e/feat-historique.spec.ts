/** Historique et versions (palette) : instantané nommé, voyage dans le temps; captures clair + sombre. */
import { test, expect } from "@playwright/test";
import { openApp, typeInCell } from "./helpers";

test.use({ viewport: { width: 1200, height: 800 } });

const DIR = "docs/screenshots/historique-local-et-voyage-dans-le-temps-dans-le-fichier";

for (const [theme, label] of [["light", "clair"], ["dark", "sombre"]] as const) {
  test(`historique et versions (${label})`, async ({ page }) => {
    await openApp(page);
    await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
    await typeInCell(page, "A1", "100");
    await typeInCell(page, "A2", "=A1*2");
    const open = async (): Promise<void> => {
      await page.keyboard.press("Control+k");
      await page.keyboard.type("Historique et versions");
      await page.keyboard.press("Enter");
    };
    await open();
    await page.locator('input[name="snap"]').fill("Clôture T1");
    await page.locator('[data-action="snap"]').click();
    await expect(page.locator(".dk-hist__snaps li")).toContainText("Clôture T1");
    await page.keyboard.press("Escape");
    await typeInCell(page, "A1", "250");
    await open();
    await page.locator("[data-snap]").first().click();
    await expect(page.locator(".dk-hist__diff")).toContainText("A1");
    await page.screenshot({ path: `${DIR}/instantane-${label}.png` });
    const r = page.locator('input[type="range"]');
    await r.fill("0");
    await expect(page.locator(".dk-hist__diff")).toContainText("A1");
    await page.screenshot({ path: `${DIR}/voyage-${label}.png` });
  });
}
