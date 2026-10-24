/** Engine e2e helpers: bulk-fill cells and assert displayed texts (built on helpers.ts). */
import { expect, type Page } from "@playwright/test";
import { cellText, openApp, typeInCell } from "./helpers";

/** Type each `addr -> raw input` pair (formulas start with "="). */
export async function fill(page: Page, data: Record<string, string>): Promise<void> {
  for (const [addr, raw] of Object.entries(data)) await typeInCell(page, addr, raw);
}

/** Assert the displayed text of each `addr -> expected`. */
export async function expectCells(page: Page, exp: Record<string, string>): Promise<void> {
  for (const [addr, text] of Object.entries(exp)) expect(await cellText(page, addr), addr).toBe(text);
}

/** Fresh app, fill `data`, assert `exp`. One call = one scenario. */
export async function scenario(page: Page, data: Record<string, string>, exp: Record<string, string>): Promise<void> {
  await openApp(page);
  await fill(page, data);
  await expectCells(page, exp);
}
