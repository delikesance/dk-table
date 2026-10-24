import { test, expect, type Page } from "@playwright/test";
import { openApp, typeInCell, cellText, selectCell, cell } from "./helpers";

/**
 * Shell / sheet tabs: add, rename (double-click and F2), switch, per-sheet data isolation,
 * and selection/focus kept when switching sheets.
 */
test.beforeEach(async ({ page }) => { await openApp(page); });

const tabs = (page: Page) => page.locator(".dk-tab:not(.dk-tab--add)");
const tab = (page: Page, name: string) => page.locator(".dk-tab", { hasText: name });

test("starts with one active sheet; + adds and activates a new one", async ({ page }) => {
  await expect(tabs(page)).toHaveText(["Feuille 1"]);
  await page.locator(".dk-tab--add").click();
  await expect(tabs(page)).toHaveText(["Feuille 1", "Feuille 2"]);
  await expect(tab(page, "Feuille 2")).toHaveAttribute("aria-selected", "true");
  await expect(tab(page, "Feuille 1")).toHaveAttribute("aria-selected", "false");
});

test("data is isolated per sheet and restored on return", async ({ page }) => {
  await typeInCell(page, "A1", "first");
  await page.locator(".dk-tab--add").click();
  expect(await cellText(page, "A1")).toBe("");
  await typeInCell(page, "A1", "second");
  await tab(page, "Feuille 1").click();
  expect(await cellText(page, "A1")).toBe("first");
  await tab(page, "Feuille 2").click();
  expect(await cellText(page, "A1")).toBe("second");
});

test("formulas are evaluated against their own sheet", async ({ page }) => {
  await typeInCell(page, "B1", "100");
  await page.locator(".dk-tab--add").click();
  await typeInCell(page, "A1", "=B1+1"); // sheet 2 B1 is empty: must not read sheet 1's 100
  expect(await cellText(page, "A1")).toBe("1");
  await typeInCell(page, "B1", "7");
  expect(await cellText(page, "A1")).toBe("8");
  await tab(page, "Feuille 1").click();
  expect(await cellText(page, "B1")).toBe("100");
});

test("double-click renames a sheet (Enter commits)", async ({ page }) => {
  await tab(page, "Feuille 1").dblclick();
  const input = page.locator(".dk-tab__input");
  await expect(input).toBeFocused();
  await input.fill("Budget");
  await input.press("Enter");
  await expect(tabs(page)).toHaveText(["Budget"]);
});

test("Escape cancels a rename; F2 starts one", async ({ page }) => {
  await tab(page, "Feuille 1").focus();
  await page.keyboard.press("F2");
  await page.locator(".dk-tab__input").fill("Oops");
  await page.keyboard.press("Escape");
  await expect(tabs(page)).toHaveText(["Feuille 1"]);
});

test("renaming keeps the data", async ({ page }) => {
  await typeInCell(page, "A1", "kept");
  await tab(page, "Feuille 1").dblclick();
  await page.locator(".dk-tab__input").fill("Renamed");
  await page.keyboard.press("Enter");
  await expect(tab(page, "Renamed")).toBeVisible();
  expect(await cellText(page, "A1")).toBe("kept");
});

test("selection carries over a sheet switch and the grid keeps keyboard focus", async ({ page }) => {
  await page.locator(".dk-tab--add").click();
  await selectCell(page, "C3");
  await tab(page, "Feuille 1").click();
  await expect(cell(page, "C3")).toHaveClass(/dkg-active/);
  await page.keyboard.type("hi"); // focus is back on the grid: typing opens the editor on C3
  await page.keyboard.press("Enter");
  expect(await cellText(page, "C3")).toBe("hi");
  await tab(page, "Feuille 2").click();
  expect(await cellText(page, "C3")).toBe("");
});

test("ArrowRight/ArrowLeft on a focused tab switch sheets", async ({ page }) => {
  await page.locator(".dk-tab--add").click();
  await tab(page, "Feuille 2").focus();
  await page.keyboard.press("ArrowLeft");
  await expect(tab(page, "Feuille 1")).toHaveAttribute("aria-selected", "true");
});

test("right-click on the only sheet does not delete it", async ({ page }) => {
  page.on("dialog", (d) => void d.dismiss());
  await tab(page, "Feuille 1").click({ button: "right" });
  await expect(tabs(page)).toHaveText(["Feuille 1"]);
});
