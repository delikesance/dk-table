/** Helpers for the feat-* specs (sort, filter, fill, colwidth, autosum, floating, autosave). */
import type { Page } from "@playwright/test";
import { cellText, typeInCell } from "./helpers";

/** Type `values` down column `col` starting at row 1 (empty strings are skipped). */
export async function fillColumn(page: Page, col: string, values: string[]): Promise<void> {
  for (const [i, v] of values.entries()) if (v !== "") await typeInCell(page, `${col}${i + 1}`, v);
}

/** Displayed texts of `col` rows 1..n. */
export async function readColumn(page: Page, col: string, n: number): Promise<string[]> {
  const out: string[] = [];
  for (let r = 1; r <= n; r++) out.push(await cellText(page, `${col}${r}`));
  return out;
}

/** Give the focus back to the grid (after a toolbar click), then press Ctrl+Z. */
export async function undo(page: Page): Promise<void> {
  await page.locator(".dkg").focus();
  await page.keyboard.press("Control+z");
}
