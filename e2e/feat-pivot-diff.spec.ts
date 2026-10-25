/** Tableau croisé (palette) et Comparer (palette) : captures clair + sombre. */
import { test, expect, type Page } from "@playwright/test";
import { openApp, typeInCell } from "./helpers";

test.use({ viewport: { width: 1200, height: 800 } });

const PIVOT = "docs/screenshots/tableaux-croises-de-calc-incomplets-non-verifie";
const DIFF = "docs/screenshots/diff-et-fusion-cellule-par-cellule-du-dktable";
const DATA = [["Region", "Produit", "Qte"], ["Nord", "A", "2"], ["Nord", "B", "1"], ["Sud", "A", "3"], ["Sud", "A", "1"]];

/** Lance une commande de la palette Ctrl+K par son libellé. */
async function command(page: Page, text: string): Promise<void> {
  await page.keyboard.press("Control+k");
  await page.keyboard.type(text);
  await page.keyboard.press("Enter");
}

async function fill(page: Page): Promise<void> {
  for (const [r, row] of DATA.entries()) for (const [c, v] of row.entries()) await typeInCell(page, `${"ABC"[c]}${r + 1}`, v);
}

for (const [theme, label] of [["light", "clair"], ["dark", "sombre"]] as const) {
  test(`tableau croisé (${label})`, async ({ page }) => {
    await openApp(page);
    await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
    await fill(page);
    await command(page, "Tableau croisé");
    await expect(page.locator('select[name="row"]')).toHaveValue("Region");
    await page.locator('select[name="col"]').selectOption("Produit");
    await page.screenshot({ path: `${PIVOT}/dialogue-${label}.png` });
    await page.locator('[data-action="create"]').click();
    await expect(page.locator('.dkg-cell[data-key="D1"]')).toHaveText("Total");
    await expect(page.locator('.dkg-cell[data-key="B2"]')).toHaveText("2");
    await page.screenshot({ path: `${PIVOT}/resultat-${label}.png` });
  });

  test(`comparer (${label})`, async ({ page }) => {
    await openApp(page);
    await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
    await fill(page);
    const other = { version: 1, sheets: [{ id: "x", name: "Feuille 1", cols: 26, rows: 100, cells: { A1: { raw: "Region" }, B1: { raw: "Produit" }, C1: { raw: "Qte" }, C2: { raw: "9" }, A9: { raw: "Est" } } }] };
    await command(page, "Comparer");
    await page.locator('input[type="file"]').setInputFiles({ name: "autre.dktable", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(other)) });
    await expect(page.locator(".dk-diff__table")).toBeVisible();
    await page.screenshot({ path: `${DIFF}/comparaison-${label}.png` });
  });
}
