/** E2E: Sheets-like freeze controls: drag the corner bars, header context menu "Figer jusqu'à…". */
import { test, expect, type Page } from "@playwright/test";
import { openApp, cell } from "./helpers";

const box = async (page: Page, sel: string) => (await page.locator(sel).first().boundingBox())!;
const drag = async (page: Page, from: { x: number; y: number }, to: { x: number; y: number }) => {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 4 });
  await page.mouse.up();
};

test.beforeEach(async ({ page }) => { await openApp(page); });

test("dragging the row bar under row 2 freezes two rows; back over the header releases", async ({ page }) => {
  const bar = await box(page, ".dkg-fz--rows");
  const r2 = await box(page, '.dkg-rowh[data-row="1"]');
  await drag(page, { x: bar.x + bar.width / 2, y: bar.y + 2 }, { x: bar.x + bar.width / 2, y: r2.y + r2.height - 3 });
  await expect(cell(page, "A2")).toHaveClass(/dkg-frozen-b/);
  const bar2 = await box(page, ".dkg-fz--rows");
  await drag(page, { x: bar2.x + 10, y: bar2.y + 2 }, { x: bar2.x + 10, y: 5 });
  await expect(cell(page, "A2")).not.toHaveClass(/dkg-frozen/);
});

test("dragging the column bar right of column B freezes two columns", async ({ page }) => {
  const bar = await box(page, ".dkg-fz--cols");
  const b = await box(page, '.dkg-colh[data-col="1"]');
  await drag(page, { x: bar.x + 2, y: bar.y + 10 }, { x: b.x + b.width - 5, y: bar.y + 10 });
  await expect(cell(page, "B5")).toHaveClass(/dkg-frozen-r/);
});

test("right-click on a column header: select it and freeze up to it", async ({ page }) => {
  await page.locator('.dkg-colh[data-col="2"]').click({ button: "right" });
  await expect(cell(page, "C10")).toHaveClass(/dkg-range/);
  await page.getByText("Figer jusqu'à la colonne C").click();
  await expect(cell(page, "C1")).toHaveClass(/dkg-frozen-r/);
  await page.locator('.dkg-rowh[data-row="3"]').click({ button: "right" });
  await page.getByText("Figer jusqu'à la ligne 4").click();
  await expect(cell(page, "A4")).toHaveClass(/dkg-frozen-b/);
  await expect(cell(page, "C1")).toHaveClass(/dkg-frozen-r/); // columns kept
});
