/** E2E: clicking a column / row header selects it whole; formatting, delete, undo then act on all of it. */
import { test, expect, type Page } from "@playwright/test";
import { openApp, typeInCell, cellText, cell } from "./helpers";

const colHead = (page: Page, name: string) => page.locator(".dkg-colh", { hasText: new RegExp(`^${name}$`) });
const rowHead = (page: Page, n: number) => page.locator(`.dkg-rowh[data-row="${n - 1}"]`);
const bold = async (page: Page, addr: string) => cell(page, addr).evaluate((e) => getComputedStyle(e).fontWeight);

test.beforeEach(async ({ page }) => { await openApp(page); });

test("column header: whole column selected, Ctrl+B and Delete apply to it", async ({ page }) => {
  await typeInCell(page, "B2", "4");
  await typeInCell(page, "B9", "5");
  await typeInCell(page, "C2", "6");
  await colHead(page, "B").click();
  await page.keyboard.press("Control+b");
  expect(await bold(page, "B30")).toBe("700");
  expect(await bold(page, "C2")).not.toBe("700");
  await page.keyboard.press("Delete");
  expect([await cellText(page, "B2"), await cellText(page, "B9"), await cellText(page, "C2")]).toEqual(["", "", "6"]);
  await page.keyboard.press("Control+z");
  expect(await cellText(page, "B9")).toBe("5");
});

test("row header: whole row selected; Shift+click and drag extend over rows", async ({ page }) => {
  await typeInCell(page, "A3", "1");
  await typeInCell(page, "Z3", "2");
  await rowHead(page, 3).click();
  await expect(cell(page, "Z3")).toHaveClass(/dkg-range/);
  await rowHead(page, 5).click({ modifiers: ["Shift"] });
  await expect(cell(page, "M4")).toHaveClass(/dkg-range/);
  await colHead(page, "A").hover();
  await page.mouse.down();
  await colHead(page, "C").hover();
  await page.mouse.up();
  await expect(cell(page, "C20")).toHaveClass(/dkg-range/);
  await expect(cell(page, "D20")).not.toHaveClass(/dkg-range/);
});
