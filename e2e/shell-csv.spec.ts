import { test, expect } from "@playwright/test";
import { openApp, typeInCell, cellText, selectCell } from "./helpers";
import { installIoMock, setNextOpen, setNextSave, readMock, menuAction } from "./helpers-shell";

/**
 * Shell / CSV: import creates a sheet named after the file (Windows and POSIX paths),
 * export writes computed values, an imported `=1+1` stays literal text.
 * Tauri dialog/fs are replaced by the `window.__DK_IO__` mock (see helpers-shell.ts).
 */
const files = {
  "C:\\data\\ventes 2024.csv": "a,b\r\n1,2\r\n",
  "/home/u/stock.csv": "x;y\n3;4\n",
  "/home/u/evil.csv": "=1+1,ok\n",
};

test.beforeEach(async ({ page }) => {
  await installIoMock(page, files);
  await openApp(page);
});

const tabNames = (page: import("@playwright/test").Page) => page.locator(".dk-tab:not(.dk-tab--add)").allTextContents();

test("import of a Windows path names the sheet after the file", async ({ page }) => {
  await setNextOpen(page, "C:\\data\\ventes 2024.csv");
  await menuAction(page, "Import / Export", "Importer un CSV");
  await expect.poll(() => tabNames(page)).toEqual(["Feuille 1", "ventes 2024"]);
  expect(await cellText(page, "A1")).toBe("a");
  expect(await cellText(page, "B2")).toBe("2");
});

test("import of a POSIX path with ; delimiter names the sheet and splits columns", async ({ page }) => {
  await setNextOpen(page, "/home/u/stock.csv");
  await menuAction(page, "Import / Export", "Importer un CSV");
  await expect.poll(() => tabNames(page)).toEqual(["Feuille 1", "stock"]);
  expect(await cellText(page, "B2")).toBe("4");
});

test("import keeps the previous sheet untouched", async ({ page }) => {
  await typeInCell(page, "A1", "keep");
  await setNextOpen(page, "/home/u/stock.csv");
  await menuAction(page, "Import / Export", "Importer un CSV");
  await page.locator(".dk-tab", { hasText: "Feuille 1" }).click();
  expect(await cellText(page, "A1")).toBe("keep");
});

test("imported =1+1 stays literal text, not 2", async ({ page }) => {
  await setNextOpen(page, "/home/u/evil.csv");
  await menuAction(page, "Import / Export", "Importer un CSV");
  await expect.poll(() => tabNames(page)).toContain("evil");
  expect(await cellText(page, "A1")).toBe("=1+1");
  expect(await cellText(page, "B1")).toBe("ok");
});

test("cancelling the import dialog adds no sheet", async ({ page }) => {
  await setNextOpen(page, null);
  await menuAction(page, "Import / Export", "Importer un CSV");
  expect(await tabNames(page)).toEqual(["Feuille 1"]);
});

test("export writes computed values, not formulas", async ({ page }) => {
  await typeInCell(page, "A1", "4");
  await typeInCell(page, "B1", "=A1*2");
  await typeInCell(page, "A2", "txt");
  await setNextSave(page, "/out/res");
  await menuAction(page, "Import / Export", "Exporter en CSV");
  await expect.poll(() => readMock(page, "/out/res.csv")).toBeTruthy();
  expect(await readMock(page, "/out/res.csv")).toBe("4,8\r\ntxt,");
});

test("export exports the active sheet only", async ({ page }) => {
  await typeInCell(page, "A1", "one");
  await page.locator(".dk-tab--add").click();
  await selectCell(page, "A1");
  await typeInCell(page, "A1", "two");
  await setNextSave(page, "/out/second.csv");
  await menuAction(page, "Import / Export", "Exporter en CSV");
  await expect.poll(() => readMock(page, "/out/second.csv")).toBe("two");
});
