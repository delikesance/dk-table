/** E2E: import CSV « texte d'abord » (rapport par colonne, accepter/refuser), thèmes clair et sombre, avec captures. */
import { test, expect } from "@playwright/test";
import { openApp, cellText } from "./helpers";

test.use({ viewport: { width: 1200, height: 800 } });

const CSV = "id,gene,iban,qte\n007,SEPT2,FR7630006000011234567890189,12\n0123,MARCH1,FR7630006000011234567890189,3\n0456,DEC1,FR7630006000011234567890189,8\n";
const DIR = "docs/screenshots/import-texte-d-abord-avec-rapport-de-conversions-risquees";

for (const theme of ["clair", "sombre"] as const) {
  test(`import texte d'abord (${theme})`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem("dk-theme", t === "clair" ? "light" : "dark"), theme);
    await openApp(page);
    await page.evaluate((c) => (window as never as { __dkImportCsv(n: string, t: string): void }).__dkImportCsv("clients", c), CSV);
    const d = page.locator('.dk-dialog[data-id="import-report"]');
    await expect(d.locator(".dk-import__col")).toHaveCount(3);
    await page.screenshot({ path: `${DIR}/rapport-${theme}.png` });
    await d.locator('input[data-col="A"]').check();
    await d.locator('[data-action="import"]').click();
    await expect(d).toHaveCount(0);
    expect(await cellText(page, "B2")).toBe("SEPT2");
    expect(await cellText(page, "A2")).toBe("7");
    await page.screenshot({ path: `${DIR}/resultat-${theme}.png` });
  });
}
