import { test, expect } from "@playwright/test";
import { openApp, selectCell, typeInCell, cellText } from "./helpers";
import { pasteText, selectRange } from "./helpers-edit";

/** E2E undo/redo: Ctrl+Z / Ctrl+Y on typing, range clearing (1 step) and pasting (1 step). */
test.beforeEach(async ({ page }) => { await openApp(page); });

test("Ctrl+Z undoes a typed value, Ctrl+Y redoes it", async ({ page }) => {
  await typeInCell(page, "A1", "42");
  await page.keyboard.press("Control+z");
  expect(await cellText(page, "A1")).toBe("");
  await page.keyboard.press("Control+y");
  expect(await cellText(page, "A1")).toBe("42");
});

test("Ctrl+Shift+Z also redoes", async ({ page }) => {
  await typeInCell(page, "A1", "42");
  await page.keyboard.press("Control+z");
  await page.keyboard.press("Control+Shift+z");
  expect(await cellText(page, "A1")).toBe("42");
});

test("undo restores the previous value and recalculates dependents", async ({ page }) => {
  await typeInCell(page, "A1", "2");
  await typeInCell(page, "B1", "=A1*3");
  await typeInCell(page, "A1", "5");
  expect(await cellText(page, "B1")).toBe("15");
  await page.keyboard.press("Control+z");
  expect(await cellText(page, "A1")).toBe("2");
  expect(await cellText(page, "B1")).toBe("6");
});

test("each typed value is its own undo step", async ({ page }) => {
  await typeInCell(page, "A1", "1");
  await typeInCell(page, "A2", "2");
  await page.keyboard.press("Control+z");
  expect(await cellText(page, "A2")).toBe("");
  expect(await cellText(page, "A1")).toBe("1");
});

test("clearing a range with Delete is a single undo step", async ({ page }) => {
  await typeInCell(page, "A1", "1");
  await typeInCell(page, "A2", "2");
  await typeInCell(page, "B1", "3");
  await typeInCell(page, "B2", "4");
  await selectRange(page, "A1", "B2");
  await page.keyboard.press("Delete");
  for (const k of ["A1", "A2", "B1", "B2"]) expect(await cellText(page, k)).toBe("");
  await page.keyboard.press("Control+z");
  expect([await cellText(page, "A1"), await cellText(page, "A2"), await cellText(page, "B1"), await cellText(page, "B2")])
    .toEqual(["1", "2", "3", "4"]);
});

test("pasting a block is a single undo step", async ({ page }) => {
  await typeInCell(page, "D1", "keep");
  await selectCell(page, "A1");
  await pasteText(page, "1\t2\n3\t4");
  expect([await cellText(page, "A1"), await cellText(page, "B1"), await cellText(page, "A2"), await cellText(page, "B2")])
    .toEqual(["1", "2", "3", "4"]);
  await page.keyboard.press("Control+z");
  for (const k of ["A1", "B1", "A2", "B2"]) expect(await cellText(page, k)).toBe("");
  expect(await cellText(page, "D1")).toBe("keep");
});

test("a new edit after undo clears the redo stack", async ({ page }) => {
  await typeInCell(page, "A1", "1");
  await page.keyboard.press("Control+z");
  await typeInCell(page, "A1", "9");
  await page.keyboard.press("Control+y");
  expect(await cellText(page, "A1")).toBe("9");
});
