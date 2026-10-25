/** Surlignage formules / constantes (palette) : captures clair + sombre. */
import { test, expect } from "@playwright/test";
import { openApp, typeInCell, cell } from "./helpers";

test.use({ viewport: { width: 1200, height: 800 } });

const DIR = "docs/screenshots/atteindre-formules-constantes";
const DATA: Record<string, string> = {
  A1: "Produit", B1: "Prix", C1: "Qté", D1: "Total",
  A2: "Stylo", B2: "1200", C2: "3", D2: "=B2*C2",
  A3: "Cahier", B3: "850", C3: "4", D3: "=B3*C3",
  A4: "Règle", B4: "940", C4: "2", D4: "1880",
  A5: "Total", D5: "=SUM(D2:D4)",
};

for (const [theme, label] of [["light", "clair"], ["dark", "sombre"]] as const) {
  test(`formules / constantes (${label})`, async ({ page }) => {
    await openApp(page);
    await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
    for (const [k, v] of Object.entries(DATA)) await typeInCell(page, k, v);
    await page.screenshot({ path: `${DIR}/avant-${label}.png` });
    await page.keyboard.press("Control+k");
    await page.keyboard.type("Surligner formules");
    await page.keyboard.press("Enter");
    await expect(page.locator("html")).toHaveClass(/dk-kinds/);
    const bg = (k: string) => cell(page, k).evaluate((e) => getComputedStyle(e).backgroundColor);
    expect(await bg("D2")).not.toBe(await bg("D4"));
    expect(await bg("B2")).not.toBe(await bg("A2"));
    await page.screenshot({ path: `${DIR}/formules-${label}.png` });
  });
}
