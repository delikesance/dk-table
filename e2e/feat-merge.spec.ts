import { test, expect } from "@playwright/test";
import { cell, openApp, selectCell, typeInCell } from "./helpers";
import { activeKey, mockFiles, selectRange } from "./helpers-edit";

/** E2E merged cells: toolbar / context menu, layout, lost values, navigation, undo, save / open round-trip. */
const MERGE = "Fusionner / annuler la fusion des cellules";

test.beforeEach(async ({ page }) => {
  await mockFiles(page);
  await openApp(page);
  page.on("dialog", (d) => void d.accept());
});

const box = async (page: import("@playwright/test").Page, k: string) => (await cell(page, k).boundingBox())!;

test("the toolbar merges a range into one big cell and keeps only the top-left value", async ({ page }) => {
  await typeInCell(page, "B2", "x");
  await typeInCell(page, "C2", "lost");
  const single = await box(page, "B2");
  await selectRange(page, "B2", "C3");
  await page.getByRole("button", { name: MERGE }).click();
  await expect(cell(page, "B2")).toHaveClass(/dkg-merged/);
  await expect(cell(page, "C2")).toBeHidden();
  await expect(cell(page, "B3")).toBeHidden();
  const merged = await box(page, "B2");
  expect(merged.width).toBeGreaterThan(single.width * 1.8);
  expect(merged.height).toBeGreaterThan(single.height * 1.8);
  expect(await activeKey(page)).toBe("B2");
  await selectCell(page, "B2");
  await expect(page.getByLabel("Contenu de la cellule")).toHaveValue("x");
});

test("clicking inside a merge selects its anchor; arrows leave the merge", async ({ page }) => {
  await selectRange(page, "B2", "C3");
  await page.getByRole("button", { name: MERGE }).click();
  await cell(page, "B2").click();
  expect(await activeKey(page)).toBe("B2");
  await page.keyboard.press("ArrowRight");
  expect(await activeKey(page)).toBe("D2");
  await page.keyboard.press("ArrowLeft");
  expect(await activeKey(page)).toBe("B2");
  await page.keyboard.press("ArrowDown");
  expect(await activeKey(page)).toBe("B4");
});

test("the button toggles: second click unmerges; Ctrl+Z / Ctrl+Y replay the merge", async ({ page }) => {
  await selectRange(page, "B2", "C2");
  await page.getByRole("button", { name: MERGE }).click();
  await expect(cell(page, "C2")).toBeHidden();
  await page.getByRole("button", { name: MERGE }).click(); // cursor sits on the merge: unmerge
  await expect(cell(page, "C2")).toBeVisible();
  await page.locator(".dkg").focus();
  await page.keyboard.press("Control+z");
  await expect(cell(page, "C2")).toBeHidden();
  await page.keyboard.press("Control+z");
  await expect(cell(page, "C2")).toBeVisible();
  await page.keyboard.press("Control+y");
  await expect(cell(page, "C2")).toBeHidden();
});

test("the context menu offers « Fusionner les cellules » then « Annuler la fusion »", async ({ page }) => {
  await selectRange(page, "B2", "B4");
  await cell(page, "B3").click({ button: "right" });
  await page.getByText("Fusionner les cellules", { exact: true }).last().click();
  await expect(cell(page, "B3")).toBeHidden();
  await cell(page, "B2").click({ button: "right" });
  await page.getByText("Annuler la fusion", { exact: true }).last().click();
  await expect(cell(page, "B3")).toBeVisible();
});

test("merges survive a save / open round-trip", async ({ page }) => {
  await selectRange(page, "B2", "C3");
  await page.getByRole("button", { name: MERGE }).click();
  await page.locator(".dkg").focus();
  await page.keyboard.press("Control+s");
  await expect.poll(() => page.evaluate(() => Object.keys((window as unknown as { __files: object }).__files).length)).toBe(1);
  const saved = await page.evaluate(() => Object.values((window as unknown as { __files: Record<string, string> }).__files)[0]);
  expect(JSON.parse(saved).sheets[0].merges).toEqual(["B2:C3"]);
  await page.keyboard.press("Control+z"); // dirty the doc and drop the merge
  await expect(cell(page, "C2")).toBeVisible();
  await page.keyboard.press("Control+o");
  await expect(cell(page, "C2")).toBeHidden();
  await expect(cell(page, "B2")).toHaveClass(/dkg-merged/);
});
