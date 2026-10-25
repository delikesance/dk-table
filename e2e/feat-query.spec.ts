/** Transformations rejouables (palette « Transformations ») : captures clair + sombre. */
import { test, expect, type Page } from "@playwright/test";
import { openApp, typeInCell } from "./helpers";

test.use({ viewport: { width: 1200, height: 800 } });

const DIR = "docs/screenshots/transformations-rejouables-mini-power-query";
const DATA = [["Region", "Produit", "Qte"], ["Nord", "A", "2"], ["Nord", "A", "2"], ["Sud", "B", "5"], ["Sud", "A", "1"]];

async function add(page: Page, kind: string, col: string, op: string, value: string): Promise<void> {
  await page.locator('select[name="kind"]').selectOption(kind);
  await page.locator('select[name="col"]').selectOption(col);
  await page.locator('select[name="op"]').selectOption(op);
  await page.locator('input[name="value"]').fill(value);
  await page.locator('[data-action="add"]').click();
}

for (const [theme, label] of [["light", "clair"], ["dark", "sombre"]] as const) {
  test(`transformations (${label})`, async ({ page }) => {
    await openApp(page);
    await page.evaluate((t) => { document.documentElement.dataset.theme = t; localStorage.removeItem("dk-table.query"); }, theme);
    for (const [r, row] of DATA.entries()) for (const [c, v] of row.entries()) await typeInCell(page, `${"ABC"[c]}${r + 1}`, v);
    await page.keyboard.press("Control+k");
    await page.keyboard.type("Transformations");
    await page.keyboard.press("Enter");
    await add(page, "dedupe", "Region", "=", "");
    await add(page, "filter", "Qte", ">", "1");
    await expect(page.locator(".dk-query__steps li")).toHaveCount(2);
    await page.screenshot({ path: `${DIR}/dialogue-${label}.png` });
    await page.locator('[data-action="apply"]').click();
    await expect(page.locator('.dkg-cell[data-key="A3"]')).toHaveText("Sud");
    await expect(page.locator('.dkg-cell[data-key="A4"]')).toHaveText("");
    await page.screenshot({ path: `${DIR}/resultat-${label}.png` });
  });
}

test("rejeu automatique : modifier la source recalcule le résultat", async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => { localStorage.removeItem("dk-table.query"); localStorage.removeItem("dk-table.livequery"); });
  for (const [r, row] of DATA.entries()) for (const [c, v] of row.entries()) await typeInCell(page, `${"ABC"[c]}${r + 1}`, v);
  await page.keyboard.press("Control+k");
  await page.keyboard.type("Transformations");
  await page.keyboard.press("Enter");
  await add(page, "filter", "Region", "=", "Sud");
  await page.locator('[data-action="apply"]').click();
  await expect(page.locator('.dkg-cell[data-key="A3"]')).toHaveText("Sud");
  await expect(page.locator('.dkg-cell[data-key="A4"]')).toHaveText("");
  await page.locator(".dk-tab").first().click();
  await typeInCell(page, "A2", "Sud");
  await page.locator(".dk-tab", { hasText: "Requête" }).click();
  await expect(page.locator('.dkg-cell[data-key="A4"]')).toHaveText("Sud");
});
