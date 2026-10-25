/** Chiffrement par mot de passe : chiffrer, ouvrir (mauvais puis bon mot de passe), retirer. Captures clair + sombre. */
import { test, expect } from "@playwright/test";
import { openApp, typeInCell, cellText } from "./helpers";
import { installIoMock, setNextOpen, setNextSave, readMock, menuAction } from "./helpers-shell";

test.use({ viewport: { width: 1200, height: 800 } });

const DIR = "docs/screenshots/chiffrement-du-classeur-par-mot-de-passe";
const FILE = "C:\docs\secret.dktable";

test.beforeEach(async ({ page }) => {
  await installIoMock(page);
  await openApp(page);
});

for (const [theme, label] of [["light", "clair"], ["dark", "sombre"]] as const) {
  test(`chiffrer, ouvrir et retirer le mot de passe (${label})`, async ({ page }) => {
    await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
    await typeInCell(page, "A1", "42");

    // Chiffrer : boîte avec confirmation, puis enregistrement chiffré
    await setNextSave(page, FILE);
    await menuAction(page, "Fichier", "Chiffrer avec mot de passe");
    const protect = page.locator('.dk-dialog[data-id="protect"]');
    await expect(protect).toBeVisible();
    await page.screenshot({ path: `${DIR}/chiffrer-${label}.png` });
    await protect.locator('input[name="pw"]').fill("secret");
    await protect.locator('input[name="pw2"]').fill("autre");
    await protect.locator('[data-action="submit"]').click();
    await expect(protect).toContainText("ne correspondent pas");
    await protect.locator('input[name="pw2"]').fill("secret");
    await protect.locator('[data-action="submit"]').click();
    await expect(protect).toHaveCount(0);
    const saved = (await readMock(page, FILE))!;
    expect(saved).toContain("dktable-encrypted");
    expect(saved).not.toContain('"raw": "42"');

    // Ouvrir : mauvais mot de passe refusé sans remplacer, puis bon mot de passe
    await menuAction(page, "Fichier", "Nouveau");
    await setNextOpen(page, FILE);
    await menuAction(page, "Fichier", "Ouvrir");
    const unlock = page.locator('.dk-dialog[data-id="unlock"]');
    await expect(unlock).toBeVisible();
    await page.screenshot({ path: `${DIR}/deverrouiller-${label}.png` });
    await unlock.locator('input[name="pw"]').fill("faux");
    await unlock.locator('[data-action="submit"]').click();
    await expect(unlock.locator(".dk-dialog__error")).toHaveText("Mot de passe incorrect ou fichier altéré");
    await unlock.locator('input[name="pw"]').fill("secret");
    await unlock.locator('[data-action="submit"]').click();
    await expect(unlock).toHaveCount(0);
    await expect.poll(() => cellText(page, "A1")).toBe("42");

    // Retirer : le fichier redevient lisible en clair
    await menuAction(page, "Fichier", "Retirer le mot de passe");
    await expect.poll(async () => (await readMock(page, FILE))?.includes('"raw": "42"')).toBe(true);
  });
}
