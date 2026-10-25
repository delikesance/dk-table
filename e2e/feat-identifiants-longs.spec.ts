/** E2E: identifiant > 15 chiffres gardé intact et signalé (dkg-long), thèmes clair et sombre, avec captures. */
import { test, expect } from "@playwright/test";
import { openApp, typeInCell, cellText, cell } from "./helpers";

test.use({ viewport: { width: 1200, height: 800 } });

for (const theme of ["clair", "sombre"] as const) {
  test(`identifiant long intact (${theme})`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem("dk-theme", t === "clair" ? "light" : "dark"), theme);
    await openApp(page);
    await typeInCell(page, "A1", "12345678901234567890");
    await typeInCell(page, "A2", "123456789012345");
    await typeInCell(page, "B1", "=A1");
    expect(await cellText(page, "A1")).toBe("12345678901234567890");
    expect(await cellText(page, "B1")).toBe("12345678901234567890");
    await expect(cell(page, "A1")).toHaveClass(/dkg-long/);
    await expect(cell(page, "A1")).toHaveAttribute("title", /Identifiant long/);
    await expect(cell(page, "A2")).not.toHaveClass(/dkg-long/);
    await page.screenshot({ path: `docs/screenshots/identifiants-longs-intacts/entree-longue-${theme}.png` });
  });
}
