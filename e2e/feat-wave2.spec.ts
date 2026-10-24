/** E2E for the spreadsheet-features wave: cross-sheet refs, insert row, Ctrl+D ref shift, F4, freeze, new functions. */
import { expect, test } from "@playwright/test";
import { cell, cellText, openApp, selectCell, typeInCell } from "./helpers";
import { selectRange } from "./helpers-edit";
import { runPalette } from "./helpers-shell";

test.beforeEach(async ({ page }) => openApp(page));

test("a formula reads another sheet and follows its edits", async ({ page }) => {
  await typeInCell(page, "A1", "5");
  await page.locator(".dk-tab--add").click();
  await typeInCell(page, "A1", "='Feuille 1'!A1*2");
  expect(await cellText(page, "A1")).toBe("10");
  await page.locator(".dk-tab", { hasText: "Feuille 1" }).click();
  await typeInCell(page, "A1", "7");
  await page.locator(".dk-tab", { hasText: "Feuille 2" }).click();
  expect(await cellText(page, "A1")).toBe("14");
});

test("inserting a row above shifts the cells and their references", async ({ page }) => {
  await typeInCell(page, "A1", "1");
  await typeInCell(page, "A2", "2");
  await typeInCell(page, "A3", "=A1+A2");
  await selectCell(page, "A2");
  await runPalette(page, "Insérer une ligne au-dessus");
  expect(await cellText(page, "A2")).toBe("");
  expect(await cellText(page, "A4")).toBe("3");
});

test("Ctrl+D shifts relative references, F4 makes them absolute", async ({ page }) => {
  for (const [k, v] of [["A1", "1"], ["A2", "2"], ["A3", "3"]]) await typeInCell(page, k, v);
  await selectCell(page, "B1");
  await page.keyboard.type("=A1*10");
  await page.keyboard.press("Enter");
  await selectRange(page, "B1", "B3");
  await page.keyboard.press("Control+d");
  expect(await cellText(page, "B3")).toBe("30");
  await selectCell(page, "C1");
  await page.keyboard.type("=A1");
  await page.keyboard.press("F4");
  await expect(page.locator(".dkg-editor")).toHaveValue("=$A$1");
});

test("new functions evaluate (TEXTJOIN, IFS, ISERROR)", async ({ page }) => {
  await typeInCell(page, "A1", '=TEXTJOIN("-",TRUE,"a","b")');
  await typeInCell(page, "A2", '=IFS(1>2,"x",TRUE,"y")');
  await typeInCell(page, "A3", "=ISERROR(1/0)");
  expect([await cellText(page, "A1"), await cellText(page, "A2"), await cellText(page, "A3")]).toEqual(["a-b", "y", "TRUE"]);
});

test("freezing the first row keeps it visible after scrolling", async ({ page }) => {
  await typeInCell(page, "A1", "Titre");
  await runPalette(page, "Figer la première ligne");
  await page.locator(".dkg").evaluate((el) => { el.scrollTop = 2000; el.dispatchEvent(new Event("scroll")); });
  await expect.poll(() => page.locator(".dkg").evaluate((el) => el.scrollTop)).toBeGreaterThan(1000);
  const [grid, a1] = [await page.locator(".dkg").boundingBox(), await cell(page, "A1").boundingBox()];
  expect(a1!.y).toBeGreaterThanOrEqual(grid!.y); // still inside the viewport, under the column headers
  expect(a1!.y).toBeLessThan(grid!.y + 60);
  expect(await cellText(page, "A1")).toBe("Titre");
});
