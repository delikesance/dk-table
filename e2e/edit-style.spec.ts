import { test, expect } from "@playwright/test";
import { openApp, selectCell, typeInCell, toggleTools } from "./helpers";
import { css, mockFiles, pickFill, selectRange } from "./helpers-edit";

/**
 * E2E formatting: bold (Ctrl+B), italic (Ctrl+I), alignment (toolbar), fill color of a cell and a range
 * (computed style, undo, save/open round-trip through an in-memory Tauri file mock).
 */
test.beforeEach(async ({ page }) => {
  await mockFiles(page);
  await openApp(page);
  page.on("dialog", (d) => void d.accept()); // "unsaved changes" confirm on Ctrl+O
});

test("Ctrl+B toggles bold on the selected cell only", async ({ page }) => {
  await typeInCell(page, "A1", "x");
  await selectCell(page, "A1");
  await page.keyboard.press("Control+b");
  expect(await css(page, "A1", "font-weight")).toBe("700");
  expect(await css(page, "A2", "font-weight")).not.toBe("700");
  await page.keyboard.press("Control+b");
  expect(await css(page, "A1", "font-weight")).not.toBe("700");
});

test("Ctrl+I toggles italic", async ({ page }) => {
  await typeInCell(page, "A1", "x");
  await selectCell(page, "A1");
  await page.keyboard.press("Control+i");
  expect(await css(page, "A1", "font-style")).toBe("italic");
  await page.keyboard.press("Control+i");
  expect(await css(page, "A1", "font-style")).toBe("normal");
});

test("Ctrl+B applies to a whole range and Ctrl+Z reverts it in one step", async ({ page }) => {
  await selectRange(page, "A1", "B2");
  await page.keyboard.press("Control+b");
  for (const k of ["A1", "B1", "A2", "B2"]) expect(await css(page, k, "font-weight")).toBe("700");
  await page.keyboard.press("Control+z");
  for (const k of ["A1", "B1", "A2", "B2"]) expect(await css(page, k, "font-weight")).not.toBe("700");
});

test("toolbar alignment buttons set text-align", async ({ page }) => {
  await toggleTools(page);
  await typeInCell(page, "A1", "x");
  await selectCell(page, "A1");
  await page.getByRole("button", { name: "Centrer" }).click();
  expect(await css(page, "A1", "text-align")).toBe("center");
  await page.getByRole("button", { name: "Aligner à droite" }).click();
  expect(await css(page, "A1", "text-align")).toBe("right");
  await page.getByRole("button", { name: "Aligner à gauche" }).click();
  expect(await css(page, "A1", "text-align")).toBe("left");
});

test("fill color of a single cell is applied and undoable", async ({ page }) => {
  await selectCell(page, "B2");
  await pickFill(page, "Rouge clair");
  expect(await css(page, "B2", "background-color")).toBe("rgb(253, 226, 224)");
  expect(await css(page, "B3", "background-color")).not.toBe("rgb(253, 226, 224)");
  await page.locator(".dkg").focus();
  await page.keyboard.press("Control+z");
  expect(await css(page, "B2", "background-color")).not.toBe("rgb(253, 226, 224)");
});

test("fill color of a range covers every cell of the range only", async ({ page }) => {
  await selectRange(page, "A1", "B2");
  await pickFill(page, "Vert clair");
  for (const k of ["A1", "B1", "A2", "B2"]) expect(await css(page, k, "background-color")).toBe("rgb(217, 242, 221)");
  expect(await css(page, "C1", "background-color")).not.toBe("rgb(217, 242, 221)");
  expect(await css(page, "A3", "background-color")).not.toBe("rgb(217, 242, 221)");
  await page.locator(".dkg").focus();
  await page.keyboard.press("Control+z");
  for (const k of ["A1", "B1", "A2", "B2"]) expect(await css(page, k, "background-color")).not.toBe("rgb(217, 242, 221)");
});

test("fill and bold survive a save / open round-trip", async ({ page }) => {
  await typeInCell(page, "A1", "x");
  await selectCell(page, "A1");
  await page.keyboard.press("Control+b");
  await pickFill(page, "Bleu clair");
  await page.locator(".dkg").focus();
  await page.keyboard.press("Control+s");
  await expect.poll(() => page.evaluate(() => Object.keys((window as unknown as { __files: object }).__files).length)).toBe(1);
  await page.keyboard.press("Control+z"); // dirty the doc and drop the fill
  await page.keyboard.press("Control+z");
  expect(await css(page, "A1", "background-color")).not.toBe("rgb(214, 230, 251)");
  await page.keyboard.press("Control+o");
  await expect.poll(() => css(page, "A1", "background-color")).toBe("rgb(214, 230, 251)");
  expect(await css(page, "A1", "font-weight")).toBe("700");
});
