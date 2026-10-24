import { test, expect } from "@playwright/test";
import { openApp, selectCell, typeInCell, cellText, toggleTools } from "./helpers";
import { fx, selectRange } from "./helpers-edit";

/** E2E number formats (toolbar select): number, percent, currency, date; display-only, raw value untouched. */
test.beforeEach(async ({ page }) => {
  await openApp(page);
  await toggleTools(page);
});

/** Display text with every kind of space (nbsp, narrow nbsp) normalized to a plain space. */
const norm = (s: string) => s.replace(/\s/g, " ");
const format = (page: import("@playwright/test").Page, v: string) =>
  page.getByLabel("Format de nombre").selectOption(v);

test("Nombre: two decimals, fr-FR grouping", async ({ page }) => {
  await typeInCell(page, "A1", "1234.5");
  await selectCell(page, "A1");
  await format(page, "number");
  expect(norm(await cellText(page, "A1"))).toBe("1 234,50");
});

test("Pourcentage: 0.25 shows 25 %", async ({ page }) => {
  await typeInCell(page, "A1", "0.25");
  await selectCell(page, "A1");
  await format(page, "percent");
  expect(norm(await cellText(page, "A1"))).toBe("25 %");
});

test("Monétaire: euros", async ({ page }) => {
  await typeInCell(page, "A1", "1234.5");
  await selectCell(page, "A1");
  await format(page, "currency");
  expect(norm(await cellText(page, "A1"))).toBe("1 234,50 €");
});

test("Date: Excel serial 45000 shows 15/03/2023", async ({ page }) => {
  await typeInCell(page, "A1", "45000");
  await selectCell(page, "A1");
  await format(page, "date");
  expect(await cellText(page, "A1")).toBe("15/03/2023");
});

test("format is display-only: formula bar keeps the raw value, dependents use it", async ({ page }) => {
  await typeInCell(page, "A1", "0.25");
  await typeInCell(page, "B1", "=A1*4");
  await selectCell(page, "A1");
  await format(page, "percent");
  await expect(fx(page)).toHaveValue("0.25");
  expect(await cellText(page, "B1")).toBe("1");
});

test("format applies to a whole range and Standard resets it", async ({ page }) => {
  await typeInCell(page, "A1", "0.5");
  await typeInCell(page, "A2", "0.75");
  await selectRange(page, "A1", "A2");
  await format(page, "percent");
  expect(norm(await cellText(page, "A1"))).toBe("50 %");
  expect(norm(await cellText(page, "A2"))).toBe("75 %");
  await format(page, "general");
  expect(await cellText(page, "A1")).toBe("0.5");
  expect(await cellText(page, "A2")).toBe("0.75");
});

test("select reflects the active cell's format", async ({ page }) => {
  await typeInCell(page, "A1", "0.5");
  await selectCell(page, "A1");
  await format(page, "percent");
  await selectCell(page, "B1");
  await expect(page.getByLabel("Format de nombre")).toHaveValue("general");
  await selectCell(page, "A1");
  await expect(page.getByLabel("Format de nombre")).toHaveValue("percent");
});

test("text cells are left unchanged by a numeric format", async ({ page }) => {
  await typeInCell(page, "A1", "abc");
  await selectCell(page, "A1");
  await format(page, "currency");
  expect(await cellText(page, "A1")).toBe("abc");
});
