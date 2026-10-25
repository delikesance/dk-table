import { expect, test, type Page } from "@playwright/test";
import { cellText, openApp, selectCell, typeInCell } from "./helpers";

/** Click an entry of a top menu. */
async function menu(page: Page, name: string, item: RegExp): Promise<void> {
  await page.locator(`.dk-menu__trigger[title="Menu ${name}"]`).click();
  await page.getByRole("menuitem", { name: item }).click();
}

/** Fill A1:B3 with a small table. */
async function fillTable(page: Page): Promise<void> {
  for (const [a, v] of [["A1", "Nom"], ["B1", "CA"], ["A2", "Bob"], ["B2", "40"], ["A3", "Claire"], ["B3", "55"]]) await typeInCell(page, a, v);
}

test("Nouveau document par le menu Fichier ; Insertion remplace Feuille et Données", async ({ page }) => {
  await openApp(page);
  await menu(page, "Fichier", /Nouveau document/);
  await expect(page.locator(".ProseMirror")).toBeVisible();
  await expect(page.locator('.dk-menu__trigger[title="Menu Insertion"]')).toBeVisible();
  await expect(page.locator('.dk-menu__trigger[title="Menu Feuille"]')).toHaveCount(0);
  await page.locator(".dk-tab:not(.dk-tab--doc)").first().click();
  await expect(page.locator('.dk-menu__trigger[title="Menu Données"]')).toBeVisible();
});

test("copier une plage, la coller dans le document, puis la voir suivre la feuille en vue scindée", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await openApp(page);
  await fillTable(page);
  await selectCell(page, "A1");
  await page.keyboard.down("Shift");
  await selectCell(page, "B3");
  await page.keyboard.up("Shift");
  await page.keyboard.press("Control+c");
  await menu(page, "Fichier", /Nouveau document/);
  await page.locator(".ProseMirror").click();
  await page.keyboard.press("Control+v");
  await expect(page.locator(".dk-block th")).toHaveCount(2);
  await expect(page.locator(".dk-block")).toContainText("Claire");
  await page.keyboard.press("Control+\\");
  await expect(page.locator(".dkg")).toBeVisible();
  await typeInCell(page, "B2", "99");
  await expect(page.locator(".dk-block")).toContainText("99");
  expect(await cellText(page, "B2")).toBe("99");
  expect(errors).toEqual([]);
});

test("@ cherche une case par ses noms ; Ctrl+E ouvre l'export", async ({ page }) => {
  await openApp(page);
  await fillTable(page);
  await menu(page, "Fichier", /Nouveau document/);
  await page.locator(".ProseMirror").click();
  await page.keyboard.type("@claire");
  await expect(page.locator(".dk-mention")).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.locator(".ProseMirror .dk-ref")).toHaveCount(1);
  await page.keyboard.press("Control+e");
  await expect(page.locator(".dk-dialog")).toContainText("Markdown");
  await expect(page.locator(".dk-dialog")).toContainText("PDF");
});
