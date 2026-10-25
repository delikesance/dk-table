/** E2E: Données > Scénarios (enregistrer la sélection, appliquer en un clic, recalcul), thèmes clair et sombre, avec captures. */
import { test, expect } from "@playwright/test";
import { openApp, typeInCell, cellText, selectCell } from "./helpers";

test.use({ viewport: { width: 1200, height: 800 } });
const dir = "docs/screenshots/gestionnaire-de-scenarios";

for (const theme of ["clair", "sombre"] as const) {
  test(`gestionnaire de scénarios (${theme})`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem("dk-theme", t === "clair" ? "light" : "dark"), theme);
    await openApp(page);
    await typeInCell(page, "A1", "100");
    await typeInCell(page, "B1", "=A1*2");
    expect(await cellText(page, "B1")).toBe("200");

    // Scénario « Base » = la cellule variable A1 (sélection courante).
    await selectCell(page, "A1");
    await page.locator('.dk-menu__trigger[title="Menu Données"]').click();
    await page.getByText("Scénarios…").click();
    const d = page.locator('.dk-dialog[data-id="scenarios"]');
    await d.locator('input[name="name"]').fill("Base");
    await d.locator('[data-action="save-scenario"]').click();
    await expect(d.locator("li")).toHaveCount(1);
    await page.screenshot({ path: `${dir}/enregistrer-${theme}.png` });
    await page.keyboard.press("Escape");

    // Changer la donnée, puis revenir au scénario « Base » en un clic.
    await typeInCell(page, "A1", "300");
    expect(await cellText(page, "B1")).toBe("600");
    await page.locator('.dk-menu__trigger[title="Menu Données"]').click();
    await page.getByText("Scénarios…").click();
    await page.locator('.dk-dialog[data-id="scenarios"] [data-action="apply-scenario"]').click();
    expect(await cellText(page, "A1")).toBe("100");
    expect(await cellText(page, "B1")).toBe("200");
    await page.screenshot({ path: `${dir}/appliquer-${theme}.png` });
  });
}
