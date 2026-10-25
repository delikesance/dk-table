/** E2E: formules portables, navigateur en fr-FR (barre de formule et éditeur en `;` et `,`), thèmes clair et sombre, avec captures. */
import { test, expect } from "@playwright/test";
import { openApp, typeInCell, cellText, selectCell } from "./helpers";

test.use({ viewport: { width: 1200, height: 800 }, locale: "fr-FR" });

for (const theme of ["clair", "sombre"] as const) {
  test(`formule portable en fr (${theme})`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem("dk-theme", t === "clair" ? "light" : "dark"), theme);
    await openApp(page);
    await typeInCell(page, "A1", "2");
    await typeInCell(page, "A2", "4");
    await typeInCell(page, "B1", "=SUM(A1;A2)*1,5");
    expect(await cellText(page, "B1")).toBe("9");
    await selectCell(page, "B1");
    await expect(page.locator(".dk-formula__input")).toHaveValue("=SUM(A1;A2)*1,5");
    await page.screenshot({ path: `docs/screenshots/formules-portables-entre-langues-et-separateurs/barre-fr-${theme}.png` });
  });
}
