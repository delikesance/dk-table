import { test, expect } from "@playwright/test";
import { openApp, selectCell, typeInCell, cellText } from "./helpers";
import { copyText, pasteText, selectRange } from "./helpers-edit";

/** E2E clipboard: TSV copy of a range, paste elsewhere (formulas stay raw), paste into another sheet, cut. */
test.beforeEach(async ({ page }) => {
  await openApp(page);
  await typeInCell(page, "A1", "1");
  await typeInCell(page, "B1", "2");
  await typeInCell(page, "A2", "=A1*10");
  await typeInCell(page, "B2", "text");
});

test("copy of a range yields raw TSV (formulas not values)", async ({ page }) => {
  await selectRange(page, "A1", "B2");
  expect(await copyText(page)).toBe("1\t2\n=A1*10\ttext");
});

test("Ctrl+C then Ctrl+V duplicates a range elsewhere", async ({ page }) => {
  await selectRange(page, "A1", "B2");
  await page.keyboard.press("Control+c");
  await selectCell(page, "D1");
  await page.keyboard.press("Control+v");
  await expect.poll(() => cellText(page, "E2")).toBe("text");
  expect(await cellText(page, "D1")).toBe("1");
  expect(await cellText(page, "E1")).toBe("2");
});

test("pasted formula shifts its relative references (Excel)", async ({ page }) => {
  await selectRange(page, "A2", "A2");
  expect(await copyText(page)).toBe("=A1*10");
  await selectCell(page, "A3");
  await pasteText(page, "=A1*10"); // same text as the in-app copy: A3 gets =A2*10
  expect(await cellText(page, "A3")).toBe("100");
});

test("paste starts at the top-left of the selection", async ({ page }) => {
  await selectRange(page, "D4", "E5");
  await pasteText(page, "a\tb\nc\td");
  expect([await cellText(page, "D4"), await cellText(page, "E4"), await cellText(page, "D5"), await cellText(page, "E5")])
    .toEqual(["a", "b", "c", "d"]);
});

test("copy in one sheet, paste into another sheet", async ({ page }) => {
  await selectRange(page, "A1", "B1");
  const tsv = await copyText(page);
  await page.getByLabel("Ajouter une feuille").click();
  await selectCell(page, "C3");
  await pasteText(page, tsv);
  expect(await cellText(page, "C3")).toBe("1");
  expect(await cellText(page, "D3")).toBe("2");
  await page.locator(".dk-tab:not(.dk-tab--add)").first().click();
  expect(await cellText(page, "C3")).toBe("");
  expect(await cellText(page, "A1")).toBe("1");
});

test("Ctrl+X cuts a range (copy + clear)", async ({ page }) => {
  await selectRange(page, "A1", "B1");
  await page.keyboard.press("Control+x");
  expect(await cellText(page, "A1")).toBe("");
  await selectCell(page, "D1");
  await page.keyboard.press("Control+v");
  expect(await cellText(page, "D1")).toBe("1");
});
