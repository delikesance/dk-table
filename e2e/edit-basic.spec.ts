import { test, expect } from "@playwright/test";
import { openApp, selectCell, typeInCell, cellText, cell } from "./helpers";
import { activeKey, fx, nameBox, rangeCount, selectRange } from "./helpers-edit";

/** E2E basic editing: typing, Enter/Tab/arrows/Escape, F2 + double-click edit, formula bar, range selection. */
test.beforeEach(async ({ page }) => { await openApp(page); });

test("Enter commits and moves down", async ({ page }) => {
  await typeInCell(page, "A1", "hello");
  expect(await cellText(page, "A1")).toBe("hello");
  expect(await activeKey(page)).toBe("A2");
});

test("Tab commits and moves right, Shift+Tab back", async ({ page }) => {
  await selectCell(page, "A1");
  await page.keyboard.type("7");
  await page.keyboard.press("Tab");
  expect(await cellText(page, "A1")).toBe("7");
  expect(await activeKey(page)).toBe("B1");
  await page.keyboard.press("Shift+Tab");
  expect(await activeKey(page)).toBe("A1");
});

test("arrow after typing commits and moves; arrows alone only move", async ({ page }) => {
  await selectCell(page, "B2");
  await page.keyboard.type("9");
  await page.keyboard.press("ArrowRight");
  expect(await cellText(page, "B2")).toBe("9");
  expect(await activeKey(page)).toBe("C2");
  await page.keyboard.press("ArrowUp");
  expect(await activeKey(page)).toBe("C1");
});

test("Escape cancels the edit", async ({ page }) => {
  await typeInCell(page, "A1", "old");
  await selectCell(page, "A1");
  await page.keyboard.type("new");
  await page.keyboard.press("Escape");
  expect(await cellText(page, "A1")).toBe("old");
  expect(await activeKey(page)).toBe("A1");
});

test("F2 edits existing content in place", async ({ page }) => {
  await typeInCell(page, "A1", "5");
  await selectCell(page, "A1");
  await page.keyboard.press("F2");
  await expect(page.locator(".dkg-editor")).toHaveValue("5");
  await page.keyboard.press("End");
  await page.keyboard.type("0");
  await page.keyboard.press("Enter");
  expect(await cellText(page, "A1")).toBe("50");
});

test("double-click opens the editor on the raw formula", async ({ page }) => {
  await typeInCell(page, "A1", "2");
  await typeInCell(page, "B1", "=A1*3");
  await cell(page, "B1").dblclick();
  await expect(page.locator(".dkg-editor")).toHaveValue("=A1*3");
  await page.keyboard.press("Escape");
  expect(await cellText(page, "B1")).toBe("6");
});

test("formula bar shows raw content and name box the address", async ({ page }) => {
  await typeInCell(page, "A1", "2");
  await typeInCell(page, "B1", "=A1*3");
  await selectCell(page, "B1");
  await expect(fx(page)).toHaveValue("=A1*3");
  await expect(nameBox(page)).toHaveValue("B1");
  expect(await cellText(page, "B1")).toBe("6");
});

test("formula bar Enter commits and recalculates", async ({ page }) => {
  await typeInCell(page, "A1", "2");
  await typeInCell(page, "B1", "=A1*3");
  await selectCell(page, "B1");
  await fx(page).fill("=A1*4");
  await fx(page).press("Enter");
  expect(await cellText(page, "B1")).toBe("8");
});

test("name box jumps to a cell", async ({ page }) => {
  await nameBox(page).fill("c5");
  await nameBox(page).press("Enter");
  expect(await activeKey(page)).toBe("C5");
});

test("shift+click selects a rectangular range", async ({ page }) => {
  await selectRange(page, "A1", "B2");
  expect(await rangeCount(page)).toBe(4);
});

test("shift+arrows extend the range from the keyboard", async ({ page }) => {
  await selectCell(page, "A1");
  await page.keyboard.press("Shift+ArrowDown");
  await page.keyboard.press("Shift+ArrowDown");
  await page.keyboard.press("Shift+ArrowRight");
  expect(await rangeCount(page)).toBe(6);
});

test("mouse drag selects a range", async ({ page }) => {
  const a = (await cell(page, "A1").boundingBox())!, b = (await cell(page, "C2").boundingBox())!;
  await page.mouse.move(a.x + 5, a.y + 5);
  await page.mouse.down();
  await page.mouse.move(b.x + 5, b.y + 5, { steps: 4 });
  await page.mouse.up();
  expect(await rangeCount(page)).toBe(6);
});
