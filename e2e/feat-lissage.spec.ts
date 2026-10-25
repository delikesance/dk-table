/** Moyenne mobile et lissage exponentiel (MOVING_AVERAGE, EXP_SMOOTH) : déversement, captures clair + sombre. */
import { test, expect } from "@playwright/test";
import { cellText, openApp, typeInCell } from "./helpers";

test.use({ viewport: { width: 1200, height: 800 } });

const DIR = "docs/screenshots/moyenne-mobile-et-lissage";
const SERIE = ["4", "6", "5", "8", "7", "9", "10", "12"];

for (const [theme, label] of [["light", "clair"], ["dark", "sombre"]] as const) {
  test(`moyenne mobile et lissage (${label})`, async ({ page }) => {
    await openApp(page);
    await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
    for (const [i, v] of SERIE.entries()) await typeInCell(page, `A${i + 1}`, v);
    await typeInCell(page, "C1", "=MOVING_AVERAGE(A1:A8;3)");
    await typeInCell(page, "E1", "=EXP_SMOOTH(A1:A8;0.5)");
    expect(await cellText(page, "C1")).toBe("");
    expect(await cellText(page, "C3")).toBe("5");
    expect(await cellText(page, "E2")).toBe("5");
    await page.screenshot({ path: `${DIR}/resultat-${label}.png` });
  });
}
