/** TCD : disposition par défaut (identifiants ignorés), dialogue en état initial, clair + sombre. */
import { test, expect } from "@playwright/test";
import { openApp, typeInCell } from "./helpers";

test.use({ viewport: { width: 1200, height: 800 } });

const DIR = "docs/screenshots/tableaux-croises-de-calc-incomplets-non-verifie";
const DATA = [["Ref", "Id", "Region", "Montant"], ["r1", "1", "Nord", "10"], ["r2", "2", "Sud", "5"], ["r3", "3", "Nord", "7"]];

for (const [theme, label] of [["light", "clair"], ["dark", "sombre"]] as const) {
  test(`disposition par défaut (${label})`, async ({ page }) => {
    await openApp(page);
    await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
    for (const [r, row] of DATA.entries()) for (const [c, v] of row.entries()) await typeInCell(page, `${"ABCD"[c]}${r + 1}`, v);
    await page.keyboard.press("Control+k");
    await page.keyboard.type("Tableau croisé");
    await page.keyboard.press("Enter");
    await expect(page.locator('select[name="row"]')).toHaveValue("Region");
    await expect(page.locator('select[name="value"]')).toHaveValue("Montant");
    await page.screenshot({ path: `${DIR}/disposition-defaut-${label}.png` });
  });
}
