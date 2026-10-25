/** Fusionner… (palette) : aperçu de la fusion à 3 voies, captures clair + sombre. */
import { test, expect, type Page } from "@playwright/test";
import { openApp, typeInCell } from "./helpers";

test.use({ viewport: { width: 1200, height: 800 } });

const DIR = "docs/screenshots/diff-et-fusion-cellule-par-cellule-du-dktable";
const sheet = (cells: Record<string, string>) => ({ version: 1, sheets: [{ id: "s1", name: "Feuille 1", cols: 26, rows: 100, cells: Object.fromEntries(Object.entries(cells).map(([k, raw]) => [k, { raw }])) }] });
const file = (name: string, cells: Record<string, string>) => ({ name, mimeType: "application/json", buffer: Buffer.from(JSON.stringify(sheet(cells))) });

/** Lance une commande de la palette Ctrl+K par son libellé. */
async function command(page: Page, text: string): Promise<void> {
  await page.keyboard.press("Control+k");
  await page.keyboard.type(text);
  await page.keyboard.press("Enter");
}

for (const [theme, label] of [["light", "clair"], ["dark", "sombre"]] as const) {
  test(`fusionner (${label})`, async ({ page }) => {
    await openApp(page);
    await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
    for (const [k, v] of [["A1", "Total"], ["A2", "10"], ["A3", "ok"]]) await typeInCell(page, k, v);
    await command(page, "Fusionner");
    await page.locator('[data-role="base"]').setInputFiles(file("base.dktable", { A1: "Total", A2: "5", A3: "ok" }));
    await page.locator('[data-role="theirs"]').setInputFiles(file("autre.dktable", { A1: "Total", A2: "7", A3: "ko", B1: "n" }));
    await expect(page.locator(".dk-merge__count")).toContainText("1 conflit");
    await expect(page.locator("tr.dk-merge--conflict")).toHaveCount(1);
    await page.screenshot({ path: `${DIR}/merge-apercu-${label}.png` });
  });
}
