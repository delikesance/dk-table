/** E2E: plan repliable (+/- par groupe, boutons de niveaux 1 à 3) sur un tableau de sous-totaux; captures clair + sombre. */
import { test, expect, type Page } from "@playwright/test";
import { cell, openApp, typeInCell } from "./helpers";

const DIR = "docs/screenshots/ui-du-plan-repliable-gouttiere-boutons-de-niveaux";
/** Niveau par ligne (0 = en-tête et sous-totaux, 1 = détail): deux groupes, fruits (lignes 2-3) et légumes (5-6). */
const LEVELS = [0, 1, 1, 0, 1, 1, 0, 0];
const DATA: [string, string][] = [
  ["A1", "Produit"], ["B1", "Montant"], ["A2", "Pommes"], ["B2", "10"], ["A3", "Poires"], ["B3", "20"],
  ["A4", "Total fruits"], ["B4", "=SUM(B2:B3)"], ["A5", "Carottes"], ["B5", "5"], ["A6", "Poireaux"], ["B6", "7"],
  ["A7", "Total légumes"], ["B7", "=SUM(B5:B6)"], ["A8", "Total général"], ["B8", "=B4+B7"],
];
const rowHead = (page: Page, row: number) => page.locator(`.dkg-rowh[data-row="${row}"]`);

async function fill(page: Page): Promise<void> {
  for (const [addr, value] of DATA) await typeInCell(page, addr, value);
  await page.evaluate((levels) => (window as unknown as { __dkOutline: (l: number[]) => void }).__dkOutline(levels), LEVELS);
}

for (const [theme, label] of [["light", "clair"], ["dark", "sombre"]] as const) {
  test(`plan repliable (${label})`, async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await openApp(page);
    await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
    await fill(page);
    await expect(page.locator(".dkg-fold")).toHaveCount(2); // +/- sur les sous-totaux 4 et 7
    await expect(page.locator('.dkg-fold[data-row="3"]')).toHaveAttribute("aria-expanded", "true");
    await page.screenshot({ path: `${DIR}/plan-initial-${label}.png` });

    // clic sur le - du sous-total fruits: les lignes 2-3 disparaissent, les numéros restent ceux de la feuille
    await page.locator('.dkg-fold[data-row="3"]').click();
    await expect(rowHead(page, 1)).toHaveCount(0);
    await expect(rowHead(page, 2)).toHaveCount(0);
    await expect(rowHead(page, 3)).toHaveText(/4/);
    await expect(cell(page, "A4")).toHaveText("Total fruits");
    await page.screenshot({ path: `${DIR}/groupe-replie-${label}.png` });

    // bouton de niveau 1: seul le niveau 0 reste visible
    await page.locator('.dkg-lvl[data-level="1"]').click();
    await expect(rowHead(page, 4)).toHaveCount(0);
    await expect(rowHead(page, 7)).toHaveText(/8/);
    await page.screenshot({ path: `${DIR}/niveau-1-${label}.png` });

    // bouton de niveau 3: tout déplié
    await page.locator('.dkg-lvl[data-level="3"]').click();
    await expect(rowHead(page, 1)).toHaveText(/2/);
    await expect(page.locator('.dkg-fold[data-row="3"]')).toHaveAttribute("aria-expanded", "true");
  });
}
