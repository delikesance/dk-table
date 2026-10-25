/** Outils d'analyse (palette) : dialogue, erreur de plage, feuille de résultats ; captures clair + sombre. */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { cell, openApp, typeInCell } from "./helpers";

test.use({ viewport: { width: 1200, height: 800 } });

const SHOTS = "docs/screenshots/dialogue-d-outils-d-analyse-et-sortie-en-feuille";
const DATA = [["Mois", "Ventes", "Marge"], ["Jan", "10", "2"], ["Fev", "20", "4"], ["Mar", "30", "6"]];

/** Lance une commande de la palette Ctrl+K par son libellé. */
async function command(page: Page, text: string): Promise<void> {
  await page.keyboard.press("Control+k");
  await page.keyboard.type(text);
  await page.keyboard.press("Enter");
}

async function fill(page: Page): Promise<void> {
  for (const [r, row] of DATA.entries()) for (const [c, v] of row.entries()) await typeInCell(page, `${"ABC"[c]}${r + 1}`, v);
}

mkdirSync(SHOTS, { recursive: true });

for (const [theme, label] of [["light", "clair"], ["dark", "sombre"]] as const) {
  test(`outils d'analyse (${label})`, async ({ page }) => {
    await openApp(page);
    await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
    await fill(page);
    await command(page, "Outils d'analyse");
    const range = page.locator('input[name="range"]');
    await expect(range).toHaveValue("A1:C4");
    await range.fill("Z90:Z91");
    await page.locator('[data-action="run"]').click();
    await expect(page.locator(".dk-data__msg")).toHaveText("Plage vide");
    await page.screenshot({ path: `${SHOTS}/erreur-plage-${label}.png` });
    await range.fill("B1:C4");
    await page.locator('select[name="tool"]').selectOption("correlation");
    await page.locator('[data-action="run"]').click();
    await expect(page.locator(".dk-dialog")).toHaveCount(0);
    await expect(cell(page, "A1")).toHaveText("");
    await expect(cell(page, "B2")).toHaveText("1");
    await page.screenshot({ path: `${SHOTS}/resultat-correlation-${label}.png` });
  });
}
