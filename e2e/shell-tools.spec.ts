import { test, expect, type Page } from "@playwright/test";
import { openApp, toggleTools, selectCell, cell } from "./helpers";
import { autoDialog } from "./helpers-shell";

/**
 * Shell / tools bar (minimal mode): default state, Ctrl+J toggle, discreet button,
 * persistence under localStorage `dk-table.tools`, Ctrl+J ignored while typing in an input.
 */
const tools = (p: Page) => p.locator(".dk-toolbar__n2");
const side = (p: Page) => p.locator(".dk-sidebar");
const btn = (p: Page) => p.locator('[data-action="toggle-tools"]');
const stored = (p: Page) => p.evaluate(() => localStorage.getItem("dk-table.tools"));

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { if (!sessionStorage.getItem("e2e.seeded")) { localStorage.clear(); sessionStorage.setItem("e2e.seeded", "1"); } });
  await openApp(page);
});

test("initial state is coherent: tools, sidebar, class and button agree", async ({ page }) => {
  const hidden = await tools(page).isHidden();
  expect(await side(page).isHidden()).toBe(hidden);
  await expect(page.locator(".dk-app")).toHaveClass(hidden ? /dk-app--minimal/ : /^(?!.*dk-app--minimal)/);
  await expect(btn(page)).toHaveAttribute("aria-expanded", String(!hidden));
});

test("minimal by default: only the sheet and the discreet button are visible", async ({ page }) => {
  await expect(tools(page)).toBeHidden();
  await expect(side(page)).toBeHidden();
  await expect(btn(page)).toBeVisible();
  await expect(btn(page)).toHaveAttribute("aria-label", "Outils (Ctrl+J)");
  await expect(page.locator(".dk-app")).toHaveClass(/dk-app--minimal/);
});

test("Ctrl+J flips tools and sidebar together, and back", async ({ page }) => {
  const before = await tools(page).isHidden();
  await toggleTools(page);
  expect(await tools(page).isHidden()).toBe(!before);
  expect(await side(page).isHidden()).toBe(!before);
  await toggleTools(page);
  expect(await tools(page).isHidden()).toBe(before);
});

test("the discreet button toggles and updates its label", async ({ page }) => {
  if (await tools(page).isHidden()) await btn(page).click();
  await expect(btn(page)).toHaveAttribute("aria-label", "Outils (Ctrl+J)");
  await expect(tools(page)).toBeVisible();
  await expect(page.locator(".dk-toolbar")).toBeVisible();
  await btn(page).click();
  await expect(btn(page)).toHaveAttribute("aria-label", "Outils (Ctrl+J)");
  await expect(tools(page)).toBeHidden();
});

test("deployed state is persisted in dk-table.tools and restored after reload", async ({ page }) => {
  if (await tools(page).isHidden()) await toggleTools(page);
  expect(await stored(page)).toBe("1");
  await page.reload();
  await page.locator(".dkg-cell").first().waitFor();
  await expect(tools(page)).toBeVisible();
  await toggleTools(page);
  expect(await stored(page)).toBe("0");
  await page.reload();
  await page.locator(".dkg-cell").first().waitFor();
  await expect(tools(page)).toBeHidden();
  await expect(page.locator(".dk-app")).toHaveClass(/dk-app--minimal/);
});

test("a corrupt stored value falls back to hidden without crashing", async ({ page }) => {
  await page.evaluate(() => localStorage.setItem("dk-table.tools", "garbage"));
  await page.reload();
  await page.locator(".dkg-cell").first().waitFor();
  await expect(tools(page)).toBeHidden();
});

test("Ctrl+J is ignored while typing in the cell editor", async ({ page }) => {
  autoDialog(page, true);
  const before = await tools(page).isHidden();
  await selectCell(page, "A1");
  await page.keyboard.press("F2");
  await expect(cell(page, "A1").locator(".dkg-editor")).toBeFocused();
  await toggleTools(page);
  expect(await tools(page).isHidden()).toBe(before);
});

test("Ctrl+J is ignored while typing in the formula bar", async ({ page }) => {
  if (await tools(page).isHidden()) await toggleTools(page);
  const before = await tools(page).isHidden();
  await page.locator(".dk-formula input").last().focus();
  await toggleTools(page);
  expect(await tools(page).isHidden()).toBe(before);
});
