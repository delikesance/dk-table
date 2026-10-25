import { test, expect } from "@playwright/test";
import { openApp, typeInCell, selectCell, cell, cellText } from "./helpers";
import { ensureTools } from "./helpers-shell";

/**
 * Shell / palette + menus: Ctrl+K command palette (French labels, fuzzy filter, run, Escape, single instance),
 * cell context menu on right-click, toolbar File and Import/Export menus driven by keyboard.
 */
test.beforeEach(async ({ page }) => { await openApp(page); });

const palette = (page: import("@playwright/test").Page) => page.locator(".dk-palette");
const items = (page: import("@playwright/test").Page) => page.locator(".dk-palette__item");

test("Ctrl+K opens the palette in French with the input focused", async ({ page }) => {
  await page.keyboard.press("Control+k");
  await expect(palette(page)).toBeVisible();
  await expect(page.locator(".dk-palette__input")).toBeFocused();
  await expect(palette(page)).toHaveAttribute("aria-label", "Palette de commandes");
  await expect(page.locator(".dk-palette__input")).toHaveAttribute("placeholder", /commande/);
  await expect(items(page).filter({ hasText: "Enregistrer sous" })).toHaveCount(1);
  await expect(items(page).filter({ hasText: "Nouvelle feuille" })).toHaveCount(1);
});

test("fuzzy filter narrows the list (subsequence and keywords)", async ({ page }) => {
  await page.keyboard.press("Control+k");
  await page.locator(".dk-palette__input").fill("ensous");
  await expect(items(page).first()).toContainText("Enregistrer sous");
  await page.locator(".dk-palette__input").fill("csv");
  // les commandes plus recentes (« Comparer… », « Tableau croise… ») contiennent aussi c, s, v dans l'ordre: elles suivent
  await expect(items(page).nth(0)).toContainText("Importer un CSV");
  await expect(items(page).nth(1)).toContainText("Exporter en CSV");
  expect(await items(page).count()).toBeLessThan(10);
  await page.locator(".dk-palette__input").fill("zzzzqq");
  await expect(items(page)).toHaveCount(0);
});

test("Enter runs the selected command and closes the palette", async ({ page }) => {
  await page.keyboard.press("Control+k");
  await page.locator(".dk-palette__input").fill("nouvelle feuille");
  await page.keyboard.press("Enter");
  await expect(palette(page)).toHaveCount(0);
  await expect(page.locator(".dk-tab:not(.dk-tab--add)")).toHaveCount(2);
});

test("clicking a result runs it", async ({ page }) => {
  await typeInCell(page, "A1", "x");
  await selectCell(page, "A1");
  await page.keyboard.press("Control+k");
  await page.locator(".dk-palette__input").fill("gras");
  await items(page).first().click();
  expect(await cell(page, "A1").evaluate((e) => e.style.fontWeight)).toBe("700");
});

test("Escape closes the palette and returns focus to the grid", async ({ page }) => {
  await selectCell(page, "B2");
  await page.keyboard.press("Control+k");
  await page.keyboard.press("Escape");
  await expect(palette(page)).toHaveCount(0);
  await page.keyboard.type("ok");
  await page.keyboard.press("Enter");
  expect(await cellText(page, "B2")).toBe("ok");
});

test("only one palette at a time; Ctrl+K again toggles it off", async ({ page }) => {
  await page.keyboard.press("Control+k");
  await page.keyboard.press("Control+k");
  await expect(palette(page)).toHaveCount(0);
  await page.keyboard.press("Control+k");
  await page.keyboard.press("Control+k");
  await page.keyboard.press("Control+k");
  await expect(palette(page)).toHaveCount(1);
});

test("right-click on a cell opens the context menu; Escape closes it", async ({ page }) => {
  await cell(page, "C2").click({ button: "right" });
  const menu = page.locator('.dk-menu[role="menu"]');
  await expect(menu).toBeVisible();
  await expect(menu.getByText("Gras")).toBeVisible();
  await expect(menu.getByText("Effacer le contenu")).toBeVisible();
  await expect(cell(page, "C2")).toHaveClass(/dkg-active/);
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
});

test("context menu action applies to the cell (clear content)", async ({ page }) => {
  await typeInCell(page, "C2", "gone");
  await cell(page, "C2").click({ button: "right" });
  await page.locator('.dk-menu[role="menu"]').getByText("Effacer le contenu").click();
  expect(await cellText(page, "C2")).toBe("");
});

test("File menu opens with the keyboard and lists its entries", async ({ page }) => {
  await ensureTools(page);
  const trigger = page.locator(".dk-menu__trigger", { hasText: "Fichier" });
  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  const list = page.locator('[role="menu"][aria-label="Fichier"]');
  await expect(list).toBeVisible();
  await expect(list.locator(".dk-menu__item")).toHaveText([
    /Nouveau/, /Nouveau document/, /Ouvrir/, /Récents/, /Enregistrer/, /Enregistrer sous/, /Importer CSV/, /Exporter CSV/, /Exporter FEC/, /Paramètres/,
  ]);
  await expect(list.locator(".dk-menu__item").first()).toBeFocused();
  await page.keyboard.press("End");
  await expect(list.locator(".dk-menu__item").last()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(list).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("the menu bar shows the 8 one-level menus, even in minimal mode", async ({ page }) => {
  await expect(page.locator(".dk-menubar .dk-menu__trigger")).toHaveText([
    "Fichier", "Édition", "Format", "Feuille", "Données", "Scripts", "Affichage", "Aide",
  ]);
  await expect(page.locator(".dk-menu__trigger", { hasText: "Import / Export" })).toHaveCount(0);
});
