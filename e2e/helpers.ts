import type { Page } from "@playwright/test";

/** Locator of a grid cell by address (e.g. "A1"); cells carry `data-key` = address. */
export const cell = (page: Page, addr: string) => page.locator(`.dkg-cell[data-key="${addr}"]`);

/** Open the app (Tauri dialog/fs are only imported lazily, absent in the browser). */
export async function openApp(page: Page): Promise<void> {
  await page.goto("/?onboarding=0"); // skip the home screen (covered by onboarding.spec.ts)
  await page.locator(".dkg-cell").first().waitFor();
}

/** Select a cell by address with a click. */
export async function selectCell(page: Page, addr: string): Promise<void> {
  await cell(page, addr).click();
}

/** Select a cell and type a value/formula, committed with Enter. */
export async function typeInCell(page: Page, addr: string, value: string): Promise<void> {
  await selectCell(page, addr);
  await page.keyboard.type(value);
  await page.keyboard.press("Enter");
}

/** Displayed text of a cell. */
export async function cellText(page: Page, addr: string): Promise<string> {
  return ((await cell(page, addr).textContent()) ?? "").trim();
}

/** Deploy/hide the tools + sidebar (Ctrl+J). */
export async function toggleTools(page: Page): Promise<void> {
  await page.keyboard.press("Control+j");
}
