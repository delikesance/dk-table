/** E2E: sort the active column A→Z / Z→A from the N2 toolbar buttons; rows move together; one Ctrl+Z undoes. */
import { test, expect } from "@playwright/test";
import { openApp, selectCell } from "./helpers";
import { ensureTools } from "./helpers-shell";
import { fillColumn, readColumn, undo } from "./helpers-new";

test.beforeEach(async ({ page }) => {
  await openApp(page);
  await fillColumn(page, "A", ["3", "1", "2"]);
  await fillColumn(page, "B", ["c", "a", "b"]);
  await ensureTools(page);
  await selectCell(page, "A1");
});

test("Trier A→Z sorts the block by the active column, rows stay intact", async ({ page }) => {
  await page.getByRole("button", { name: "Trier A→Z" }).click();
  expect(await readColumn(page, "A", 3)).toEqual(["1", "2", "3"]);
  expect(await readColumn(page, "B", 3)).toEqual(["a", "b", "c"]);
});

test("Trier Z→A sorts descending", async ({ page }) => {
  await page.getByRole("button", { name: "Trier Z→A" }).click();
  expect(await readColumn(page, "A", 3)).toEqual(["3", "2", "1"]);
  expect(await readColumn(page, "B", 3)).toEqual(["c", "b", "a"]);
});

test("a sort is undone by a single Ctrl+Z", async ({ page }) => {
  await page.getByRole("button", { name: "Trier A→Z" }).click();
  await undo(page);
  expect(await readColumn(page, "A", 3)).toEqual(["3", "1", "2"]);
  expect(await readColumn(page, "B", 3)).toEqual(["c", "a", "b"]);
});
