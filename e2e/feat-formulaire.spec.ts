/** Saisie par formulaire (palette) : champs par colonne, obligatoire bloquant, ligne ajoutée, captures clair + sombre. */
import { test, expect, type Page } from "@playwright/test";
import { openApp, typeInCell } from "./helpers";

test.use({ viewport: { width: 1200, height: 800 } });

const SHOTS = "docs/screenshots/vue-formulaire-saisie-de-lignes";
const DATA = [["Nom", "Qte", "Date"], ["Ana", "2", "03/01/2026"], ["Ben", "1", "04/01/2026"]];

/** Lance une commande de la palette Ctrl+K par son libellé. */
async function command(page: Page, text: string): Promise<void> {
  await page.keyboard.press("Control+k");
  await page.keyboard.type(text);
  await page.keyboard.press("Enter");
}

for (const [theme, label] of [["light", "clair"], ["dark", "sombre"]] as const) {
  test(`saisie par formulaire (${label})`, async ({ page }) => {
    await openApp(page);
    await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
    for (const [r, row] of DATA.entries()) for (const [c, v] of row.entries()) await typeInCell(page, `${"ABC"[c]}${r + 1}`, v);
    await command(page, "Saisie par formulaire");
    const form = page.locator('.dk-dialog[data-id="form"]');
    await expect(form.locator("label[data-label]")).toHaveText(["Nom", "Qte", "Date"]);
    await form.locator('input[data-required="0"]').check();
    await page.screenshot({ path: `${SHOTS}/formulaire-initial-${label}.png` });

    await form.locator('[data-action="submit"]').click();
    await expect(form.locator('[data-error="0"]')).toHaveText("Champ obligatoire");
    await page.screenshot({ path: `${SHOTS}/formulaire-obligatoire-${label}.png` });

    await form.locator('input[data-field="0"]').fill("Cy");
    await form.locator('input[data-field="1"]').fill("1,5");
    await form.locator('input[data-field="2"]').fill("31/12/2026");
    await form.locator('[data-action="submit"]').click();
    await expect(form.locator('[role="status"]')).toHaveText("Ligne 4 ajoutée");
    await expect(form.locator('input[data-field="0"]')).toHaveValue("");
    await page.screenshot({ path: `${SHOTS}/formulaire-resultat-${label}.png` });
  });
}

test("le formulaire ajoute la ligne dans la feuille", async ({ page }) => {
  await openApp(page);
  for (const [r, row] of DATA.entries()) for (const [c, v] of row.entries()) await typeInCell(page, `${"ABC"[c]}${r + 1}`, v);
  await command(page, "Saisie par formulaire");
  const form = page.locator('.dk-dialog[data-id="form"]');
  await form.locator('input[data-field="0"]').fill("Cy");
  await form.locator('input[data-field="1"]').fill("7");
  await form.locator('input[data-field="2"]').fill("31/12/2026");
  await form.locator('[data-action="submit"]').click();
  await expect(page.locator('.dkg-cell[data-key="A4"]')).toHaveText("Cy");
  await expect(page.locator('.dkg-cell[data-key="B4"]')).toHaveText("7");
});
