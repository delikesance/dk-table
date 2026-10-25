/** Validation à l'épreuve du collage : règle posée, collage invalide signalé, panneau + « Corriger ». Captures clair + sombre. */
import { test, expect } from "@playwright/test";
import { openApp, typeInCell, cell, cellText } from "./helpers";

test.use({ viewport: { width: 1200, height: 800 } });

const DIR = "docs/screenshots/validation-a-l-epreuve-du-collage";

/** Paste `text` at the selection through a clipboard-like event (the browser clipboard is not available headless). */
async function paste(page: import("@playwright/test").Page, text: string): Promise<void> {
  await page.evaluate((t) => {
    const e = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(e, "clipboardData", { value: { getData: () => t, setData: () => {} } });
    document.querySelector(".dkg")!.dispatchEvent(e);
  }, text);
}

for (const [theme, label] of [["light", "clair"], ["dark", "sombre"]] as const) {
  test(`collage invalide (${label})`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem("dk-theme", t), theme);
    await openApp(page);
    await typeInCell(page, "A1", "Quantité");
    await cell(page, "A2").click();
    await cell(page, "A9").click({ modifiers: ["Shift"] });
    await page.keyboard.press("Control+k");
    await page.keyboard.type("Validation des données");
    await page.keyboard.press("Enter");
    await page.locator('.dk-val__form [name="min"]').fill("1");
    await page.locator('.dk-val__form [name="max"]').fill("100");
    await page.locator('[data-action="add"]').click();
    await expect(page.locator(".dk-val__rules li")).toContainText("A2:A9");
    await page.locator(".dk-dialog [data-action=close]").click();
    await cell(page, "A2").click();
    await paste(page, "12\n250\n40\nabc\n7\n-3");
    await expect(page.locator(".dk-toast__msg")).toContainText("3 cellules invalides");
    await expect(cell(page, "A3")).toHaveAttribute("data-inv", "");
    await expect(cell(page, "A2")).not.toHaveAttribute("data-inv", "");
    await page.screenshot({ path: `${DIR}/collage-signale-${label}.png` });
    await page.locator(".dk-toast__action").click();
    await expect(page.locator(".dk-val__bad li")).toHaveCount(3);
    await page.screenshot({ path: `${DIR}/panneau-${label}.png` });
    await page.locator('.dk-val__bad [data-action="fix"]').first().click();
    await expect(page.locator(".dk-val__bad li")).toHaveCount(2);
    await page.locator('[data-action="fix-all"]').click();
    await expect(page.locator(".dk-val__bad li")).toHaveCount(0);
    await page.locator(".dk-dialog [data-action=close]").click();
    expect(await cellText(page, "A3")).toBe("");
    expect(await cellText(page, "A4")).toBe("40");
  });
}
