/** E2E: Format > Personnalisé… (code 0.0" cm", aperçu, résultat dans la cellule), thèmes clair et sombre, avec captures. */
import { test, expect } from "@playwright/test";
import { openApp, typeInCell, cellText, selectCell } from "./helpers";

test.use({ viewport: { width: 1200, height: 800 } });

const DIR = "docs/screenshots/formats-de-nombre-personnalises";

for (const theme of ["clair", "sombre"] as const) {
  test(`format personnalisé (${theme})`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem("dk-theme", t === "clair" ? "light" : "dark"), theme);
    await openApp(page);
    await typeInCell(page, "A1", "12.5");
    await typeInCell(page, "A2", "-3");
    await selectCell(page, "A1");
    await page.keyboard.press("Shift+ArrowDown");
    await page.locator('.dk-menu__trigger[title="Menu Format"]').click();
    await page.getByText("Personnalisé…").click();
    const d = page.locator('.dk-dialog[data-id="custom-format"]');
    await d.locator('input[name="code"]').fill('0.0" cm";-0.0" cm";"zéro"');
    await expect(d.locator(".dk-dialog__preview")).toContainText("cm");
    await page.screenshot({ path: `${DIR}/dialogue-${theme}.png` });
    await d.locator('[data-action="apply"]').click();
    expect(await cellText(page, "A1")).toBe("12,5 cm");
    expect(await cellText(page, "A2")).toBe("-3,0 cm");
    await page.screenshot({ path: `${DIR}/resultat-${theme}.png` });
  });
}
