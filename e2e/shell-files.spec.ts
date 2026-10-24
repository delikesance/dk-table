import { test, expect } from "@playwright/test";
import { openApp, typeInCell, cellText, selectCell, cell } from "./helpers";
import { installIoMock, setNextOpen, setNextSave, readMock, writes, menuAction, toast, toastAction, title, ensureTools } from "./helpers-shell";

/**
 * Shell / files: New, Save as -> mock file, Open, values+formulas+styles round trip,
 * confirmation before discarding a modified workbook, recent files persisted across reloads.
 * Tauri dialog/fs are replaced by the `window.__DK_IO__` in-memory mock (see helpers-shell.ts).
 */
test.beforeEach(async ({ page }) => {
  await installIoMock(page);
  await openApp(page);
});

/** Fill a small workbook: A1=2, B1==A1*3 (bold), C1=hello. */
async function fill(page: import("@playwright/test").Page) {
  await typeInCell(page, "A1", "2");
  await typeInCell(page, "B1", "=A1*3");
  await typeInCell(page, "C1", "hello");
  await selectCell(page, "B1");
  await page.keyboard.press("Control+b");
}

test("Save as writes the mock file with values, formulas and styles", async ({ page }) => {
  await fill(page);
  await setNextSave(page, "C:\\docs\\budget");
  await page.keyboard.press("Control+Shift+s");
  await expect.poll(() => readMock(page, "C:\\docs\\budget.dktable")).toBeTruthy();
  const doc = JSON.parse((await readMock(page, "C:\\docs\\budget.dktable"))!);
  expect(JSON.stringify(doc)).toContain("=A1*3");
  expect(JSON.stringify(doc)).toContain("bold");
  await expect.poll(() => title(page)).toContain("budget.dktable");
});

test("round trip: New then Open restores values, formulas and styles", async ({ page }) => {
  await fill(page);
  await setNextSave(page, "/home/u/rt.dktable");
  await menuAction(page, "Fichier", "Enregistrer sous");
  await expect.poll(() => writes(page)).toEqual(["/home/u/rt.dktable"]);
  await expect.poll(() => title(page)).not.toContain("•");
  await menuAction(page, "Fichier", "Nouveau");
  expect(await cellText(page, "A1")).toBe("");
  await setNextOpen(page, "/home/u/rt.dktable");
  await menuAction(page, "Fichier", "Ouvrir");
  await expect.poll(() => cellText(page, "B1")).toBe("6");
  expect(await cellText(page, "C1")).toBe("hello");
  expect(await cell(page, "B1").evaluate((e) => e.style.fontWeight)).toBe("700");
  await typeInCell(page, "A1", "10"); // formulas stay live after load
  expect(await cellText(page, "B1")).toBe("30");
});

test("New on a modified workbook proceeds and the toast Annuler restores it", async ({ page }) => {
  await typeInCell(page, "A1", "42");
  await menuAction(page, "Fichier", "Nouveau");
  await expect.poll(() => cellText(page, "A1")).toBe("");
  await expect(toast(page)).toContainText("Classeur remplacé");
  await toastAction(page);
  await expect.poll(() => cellText(page, "A1")).toBe("42");
});

test("New on a clean workbook shows no native dialog", async ({ page }) => {
  let dialogs = 0;
  page.on("dialog", (d) => { dialogs++; void d.dismiss(); });
  await page.keyboard.press("Control+n");
  expect(dialogs).toBe(0);
});

test("Open replaces a modified workbook with a toast whose Annuler brings back the edit", async ({ page }) => {
  await typeInCell(page, "A1", "1");
  await setNextSave(page, "/f/other.dktable");
  await page.keyboard.press("Control+s");
  await expect.poll(() => title(page)).not.toContain("•");
  await typeInCell(page, "A1", "7");
  await setNextOpen(page, "/f/other.dktable");
  await menuAction(page, "Fichier", "Ouvrir");
  await expect.poll(() => cellText(page, "A1")).toBe("1");
  await expect(toast(page)).toContainText("Classeur remplacé");
  await toastAction(page);
  await expect.poll(() => cellText(page, "A1")).toBe("7");
});

test("recent files persist after reload and reopen from the sidebar", async ({ page }) => {
  await typeInCell(page, "A1", "5");
  await setNextSave(page, "C:\\w\\recent1.dktable");
  await page.keyboard.press("Control+Shift+s");
  await expect.poll(() => title(page)).toContain("recent1.dktable");
  await page.reload();
  await page.locator(".dkg-cell").first().waitFor();
  await ensureTools(page);
  const item = page.locator(".dk-recent li", { hasText: "recent1.dktable" });
  await expect(item).toBeVisible();
  await item.click();
  await expect.poll(() => cellText(page, "A1")).toBe("5");
  await expect.poll(() => title(page)).toContain("recent1.dktable");
});

test("cancelling the save dialog leaves the workbook dirty and writes nothing", async ({ page }) => {
  await typeInCell(page, "A1", "1");
  await setNextSave(page, null);
  await page.keyboard.press("Control+s");
  expect(await writes(page)).toEqual([]);
  expect(await title(page)).toContain("•");
});
