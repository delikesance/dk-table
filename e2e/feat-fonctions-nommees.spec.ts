/** E2E: Données > Fonctions nommées (dialogue, appel dans une cellule, recalcul), thèmes clair et sombre, avec captures. */
import { test, expect } from "@playwright/test";
import { openApp, typeInCell, cellText } from "./helpers";

test.use({ viewport: { width: 1200, height: 800 } });
const dir = "docs/screenshots/fonctions-nommees";

for (const theme of ["clair", "sombre"] as const) {
  test(`fonctions nommées (${theme})`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem("dk-theme", t === "clair" ? "light" : "dark"), theme);
    await openApp(page);
    await typeInCell(page, "A1", "100");
    await typeInCell(page, "B1", "=TVA(A1;0.2)");
    expect(await cellText(page, "B1")).toBe("#NAME?");
    await page.locator('.dk-menu__trigger[title="Menu Données"]').click();
    await page.getByText("Fonctions nommées…").click();
    const d = page.locator('.dk-dialog[data-id="named-fns"]');
    await d.locator('[name="name"]').fill("TVA");
    await d.locator('[name="params"]').fill("ht; taux");
    await d.locator('[name="body"]').fill("=ht*(1+taux)");
    await page.screenshot({ path: `${dir}/dialogue-${theme}.png` });
    await d.locator('[data-action="add-fn"]').click();
    await expect(d.locator("li")).toHaveCount(1);
    await page.keyboard.press("Escape");
    expect(await cellText(page, "B1")).toBe("120");
    await typeInCell(page, "A1", "200");
    expect(await cellText(page, "B1")).toBe("240");
    await page.screenshot({ path: `${dir}/resultat-${theme}.png` });
  });
}
