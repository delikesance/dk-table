import { test, expect } from "@playwright/test";
import { cellText, openApp, typeInCell } from "./helpers";

for (const [theme, label] of [["light", "clair"], ["dark", "sombre"]] as const) {
  test(`spill : SPLIT/UNIQUE/SORT et #SPILL! (${theme})`, async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await openApp(page);
    await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
    for (const [a, v] of [["A1", "pomme,poire,prune"], ["A3", "b"], ["A4", "a"], ["A5", "b"], ["A6", "c"]]) await typeInCell(page, a, v);
    await typeInCell(page, "A2", '=SPLIT(A1;",")');
    await typeInCell(page, "C3", "=UNIQUE(A3:A6)");
    await typeInCell(page, "E3", "=SORT(A3:A6)");
    await typeInCell(page, "G2", "bloc");
    await typeInCell(page, "F2", '=SPLIT(A1;",")');
    expect(await cellText(page, "C5")).toBe("c");
    expect(await cellText(page, "B2")).toBe("poire");
    expect(await cellText(page, "F2")).toBe("#SPILL!");
    await page.screenshot({ path: `docs/screenshots/formules-a-resultat-debordant-spill-et-fonctions-sheets/spill-${label}.png` });
  });
}
