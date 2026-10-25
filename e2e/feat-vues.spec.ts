/** Valeur cible, vue Galerie et vue Kanban (palette) : comportements clés + captures clair et sombre. */
import { test, expect, type Page } from "@playwright/test";
import { openApp, typeInCell } from "./helpers";

test.use({ viewport: { width: 1200, height: 800 } });

const TASKS = [["Tâche", "Statut", "Ville"], ["Devis", "Ouvert", "Lyon"], ["Maquette", "En cours", "Nice"], ["Contrat", "", "Paris"], ["Facture", "Ouvert", "Lille"]];

/** Lance une commande de la palette Ctrl+K par son libellé. */
async function command(page: Page, text: string): Promise<void> {
  await page.keyboard.press("Control+k");
  await page.keyboard.type(text);
  await page.keyboard.press("Enter");
}

async function fill(page: Page, rows: string[][]): Promise<void> {
  for (const [r, row] of rows.entries()) for (const [c, v] of row.entries()) if (v) await typeInCell(page, `${"ABC"[c]}${r + 1}`, v);
}

for (const [theme, label] of [["light", "clair"], ["dark", "sombre"]] as const) {
  test(`valeur cible (${label})`, async ({ page }) => {
    const dir = "docs/screenshots/valeur-cible-goal-seek";
    await openApp(page);
    await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
    await fill(page, [["2", "=3*A1+1"]]);
    await command(page, "Valeur cible");
    const box = page.locator('.dk-dialog[data-id="goalseek"]');
    await box.locator('input[name="formula"]').fill("B1");
    await box.locator('input[name="target"]').fill("16");
    await box.locator('input[name="variable"]').fill("A1");
    await page.screenshot({ path: `${dir}/valeur-cible-initial-${label}.png` });
    await box.locator('[data-action="seek"]').click();
    await expect(box.locator('[role="status"]')).toContainText("A1 = 5");
    await page.screenshot({ path: `${dir}/valeur-cible-resultat-${label}.png` });
    await box.locator('[data-action="apply"]').click();
    await box.locator('[data-action="close"]').click();
    await expect(page.locator('.dkg-cell[data-key="B1"]')).toHaveText("16");
  });

  test(`vue galerie (${label})`, async ({ page }) => {
    const dir = "docs/screenshots/vue-galerie-cartes";
    await openApp(page);
    await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
    await fill(page, TASKS);
    await command(page, "Vue Galerie");
    const box = page.locator('.dk-dialog[data-id="gallery"]');
    await expect(box.locator("[data-card]")).toHaveCount(4);
    await page.screenshot({ path: `${dir}/galerie-${label}.png` });
    await box.locator('[data-card="3"]').click();
  });

  test(`vue kanban (${label})`, async ({ page }) => {
    const dir = "docs/screenshots/vue-kanban-groupement-par-colonne-de-statut";
    await openApp(page);
    await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
    await fill(page, TASKS);
    await command(page, "Vue Kanban");
    const box = page.locator('.dk-dialog[data-id="kanban"]');
    await expect(box.locator("[data-col]")).toHaveText([/Ouvert/, /En cours/, /Sans statut/]);
    await page.screenshot({ path: `${dir}/kanban-initial-${label}.png` });
    await box.locator('[data-row="2"] select').selectOption("En cours");
    await expect(box.locator('[data-col="En cours"] [data-row="2"]')).toBeVisible();
    await page.screenshot({ path: `${dir}/kanban-deplace-${label}.png` });
  });
}
