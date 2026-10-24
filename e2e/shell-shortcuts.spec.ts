import { test, expect } from "@playwright/test";
import { openApp, typeInCell, cellText, selectCell, cell } from "./helpers";
import { installIoMock, setNextOpen, setNextSave, readMock, writes, autoDialog, title } from "./helpers-shell";

/**
 * Shell / shortcuts: Ctrl+S, Ctrl+Shift+S, Ctrl+O, Ctrl+N, Ctrl+Z/Y act from the grid,
 * and Ctrl+Z/Y/B/I do NOT hijack the cell editor (native text editing keeps them).
 * Tauri dialog/fs are replaced by the `window.__DK_IO__` mock (see helpers-shell.ts).
 */
test.beforeEach(async ({ page }) => {
  await installIoMock(page);
  await openApp(page);
});

const weight = (page: import("@playwright/test").Page, a: string) => cell(page, a).evaluate((e) => e.style.fontWeight);
const italic = (page: import("@playwright/test").Page, a: string) => cell(page, a).evaluate((e) => e.style.fontStyle);

test("Ctrl+S on an untitled workbook asks a path then saves; second Ctrl+S reuses it", async ({ page }) => {
  await typeInCell(page, "A1", "9");
  await setNextSave(page, "/s/book");
  await page.keyboard.press("Control+s");
  await expect.poll(() => readMock(page, "/s/book.dktable")).toBeTruthy();
  await expect.poll(() => title(page)).not.toContain("•");
  await setNextSave(page, "/s/ignored"); // must not be asked again
  await typeInCell(page, "A2", "10");
  await page.keyboard.press("Control+s");
  await expect.poll(() => writes(page)).toEqual(["/s/book.dktable", "/s/book.dktable"]);
  expect(await readMock(page, "/s/ignored.dktable")).toBeUndefined();
});

test("Ctrl+Shift+S always asks for a new destination", async ({ page }) => {
  await setNextSave(page, "/s/one");
  await page.keyboard.press("Control+s");
  await expect.poll(() => writes(page)).toEqual(["/s/one.dktable"]);
  await setNextSave(page, "/s/two");
  await page.keyboard.press("Control+Shift+s");
  await expect.poll(() => writes(page)).toEqual(["/s/one.dktable", "/s/two.dktable"]);
});

test("Ctrl+O opens the chosen mock file", async ({ page }) => {
  await typeInCell(page, "A1", "from-file");
  await setNextSave(page, "/s/src");
  await page.keyboard.press("Control+s");
  await expect.poll(() => title(page)).not.toContain("•");
  await typeInCell(page, "A1", "changed");
  await page.keyboard.press("Control+s");
  await typeInCell(page, "B1", "x");
  autoDialog(page, true);
  await setNextOpen(page, "/s/src.dktable");
  await page.keyboard.press("Control+o");
  await expect.poll(() => cellText(page, "A1")).toBe("changed");
  expect(await cellText(page, "B1")).toBe("");
});

test("Ctrl+N resets the workbook (confirms when modified)", async ({ page }) => {
  await typeInCell(page, "A1", "bye");
  const seen = autoDialog(page, true);
  await page.keyboard.press("Control+n");
  await expect.poll(() => cellText(page, "A1")).toBe("");
  expect(seen()).toHaveLength(0); // no native dialog: undo toast is the safety net
});

test("Ctrl+Z / Ctrl+Y undo and redo from the grid", async ({ page }) => {
  await typeInCell(page, "A1", "1");
  await typeInCell(page, "A2", "2");
  await selectCell(page, "A3");
  await page.keyboard.press("Control+z");
  await expect.poll(() => cellText(page, "A2")).toBe("");
  expect(await cellText(page, "A1")).toBe("1");
  await page.keyboard.press("Control+y");
  await expect.poll(() => cellText(page, "A2")).toBe("2");
  await page.keyboard.press("Control+z");
  await page.keyboard.press("Control+Shift+z");
  await expect.poll(() => cellText(page, "A2")).toBe("2");
});

test("Ctrl+B / Ctrl+I style the selected cell from the grid", async ({ page }) => {
  await typeInCell(page, "A1", "t");
  await selectCell(page, "A1");
  await page.keyboard.press("Control+b");
  await page.keyboard.press("Control+i");
  expect(await weight(page, "A1")).toBe("700");
  expect(await italic(page, "A1")).toBe("italic");
  await page.keyboard.press("Control+b");
  expect(await weight(page, "A1")).toBe("");
});

test("Ctrl+B / Ctrl+I do not style the cell while its editor is open", async ({ page }) => {
  await selectCell(page, "A1");
  await page.keyboard.type("abc"); // editor open with typed text
  await expect(cell(page, "A1").locator(".dkg-editor")).toBeFocused();
  await page.keyboard.press("Control+b");
  await page.keyboard.press("Control+i");
  await page.keyboard.press("Enter");
  expect(await weight(page, "A1")).toBe("");
  expect(await italic(page, "A1")).toBe("");
  expect(await cellText(page, "A1")).toBe("abc");
});

test("Ctrl+Z / Ctrl+Y inside the editor do not undo/redo the workbook", async ({ page }) => {
  await typeInCell(page, "A1", "keep");
  await typeInCell(page, "A2", "also");
  await selectCell(page, "A3");
  await page.keyboard.type("draft");
  await page.keyboard.press("Control+z"); // native text undo only
  await page.keyboard.press("Control+y");
  await page.keyboard.press("Escape");
  expect(await cellText(page, "A1")).toBe("keep");
  expect(await cellText(page, "A2")).toBe("also");
});

test("Ctrl+Z in the formula bar leaves the workbook alone", async ({ page }) => {
  await typeInCell(page, "A1", "v1");
  await page.locator(".dk-formula input").last().focus();
  await page.keyboard.type("zzz");
  await page.keyboard.press("Control+z");
  expect(await cellText(page, "A1")).toBe("v1");
});
