import { test, expect } from "@playwright/test";
import { openApp, selectCell, typeInCell, cellText, cell, toggleTools } from "./helpers";

/** E2E décimal exact : option Paramètres, 0,1+0,2 = 0,3, écart affiché ≠ stocké signalé. Captures clair/sombre. */
const DIR = "docs/screenshots/decimal-exact-mode-comptable";

for (const [theme, label] of [["light", "clair"], ["dark", "sombre"]] as const) {
  test(`décimal exact (${label})`, async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await openApp(page);
    await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
    await toggleTools(page);
    await typeInCell(page, "A1", "=0.1+0.2-0.3");
    await typeInCell(page, "A2", "=1.005*1");
    await selectCell(page, "A2");
    await page.getByLabel("Format de nombre").selectOption("number");
    expect(await cellText(page, "A1")).not.toBe("0");
    await page.keyboard.press("Control+,");
    await page.locator('input[name="decimal"]').check();
    await page.screenshot({ path: `${DIR}/option-${label}.png` });
    await page.keyboard.press("Escape");
    expect(await cellText(page, "A1")).toBe("0");
    await expect(cell(page, "A2")).toHaveClass(/dkg-gap/);
    await expect(cell(page, "A2")).toHaveAttribute("title", /Affiché ≠ stocké/);
    await selectCell(page, "C5"); // curseur hors de A2 : le coin orange reste visible
    await page.screenshot({ path: `${DIR}/ecart-${label}.png` });
  });
}
