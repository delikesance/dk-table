import type { Page } from "@playwright/test";
import { cell } from "./helpers";

/** Locator of the formula bar content input (raw cell content). */
export const fx = (page: Page) => page.getByLabel("Contenu de la cellule");

/** Locator of the name box (active cell address). */
export const nameBox = (page: Page) => page.getByLabel("Cellule active");

/** Number of cells currently highlighted as part of the selection range. */
export const rangeCount = (page: Page) => page.locator(".dkg-cell.dkg-range").count();

/** Address of the active cell (the one carrying `.dkg-active`). */
export async function activeKey(page: Page): Promise<string | null> {
  return page.locator(".dkg-cell.dkg-active").getAttribute("data-key");
}

/** Select the range a1..b1 with a click then a shift+click. */
export async function selectRange(page: Page, a1: string, b1: string): Promise<void> {
  await cell(page, a1).click();
  await cell(page, b1).click({ modifiers: ["Shift"] });
}

/** Computed CSS property of a cell. */
export async function css(page: Page, addr: string, prop: string): Promise<string> {
  return cell(page, addr).evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop);
}

/** Pick a fill color through the toolbar's color input (tools must be deployed). */
export async function pickFill(page: Page, hex: string): Promise<void> {
  await page.locator('input[type="color"][aria-label="Couleur de fond"]').evaluate((el, v) => {
    const i = el as HTMLInputElement;
    i.value = v;
    i.dispatchEvent(new Event("input", { bubbles: true }));
  }, hex);
}

/** Dispatch a paste of `text` (TSV) on the grid. */
export async function pasteText(page: Page, text: string): Promise<void> {
  await page.evaluate((t) => {
    const dt = new DataTransfer();
    dt.setData("text/plain", t);
    (document.querySelector(".dkg") as HTMLElement).dispatchEvent(
      new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  }, text);
}

/** Dispatch a copy on the grid and return the TSV it put on the clipboard. */
export async function copyText(page: Page): Promise<string> {
  return page.evaluate(() => {
    const dt = new DataTransfer();
    (document.querySelector(".dkg") as HTMLElement).dispatchEvent(
      new ClipboardEvent("copy", { clipboardData: dt, bubbles: true, cancelable: true }));
    return dt.getData("text/plain");
  });
}

/**
 * Install an in-memory Tauri mock (dialogs + fs) BEFORE the app loads. Dialogs return `path`;
 * written files are kept in `window.__files` (path -> text), lost on reload. Call before `openApp`.
 */
export async function mockFiles(page: Page, path = "/mock/test.dktable"): Promise<void> {
  await page.addInitScript((p) => {
    const files: Record<string, string> = {};
    (window as unknown as { __files: typeof files }).__files = files;
    (window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__ = {
      invoke: async (cmd: string, args: unknown, opts?: { headers?: Record<string, string> }) => {
        if (cmd === "plugin:dialog|save" || cmd === "plugin:dialog|open") return p;
        if (cmd === "plugin:fs|write_text_file") {
          files[decodeURIComponent(opts!.headers!.path)] = new TextDecoder().decode(args as Uint8Array);
          return null;
        }
        if (cmd === "plugin:fs|read_text_file") {
          return new TextEncoder().encode(files[(args as { path: string }).path]).buffer;
        }
        return null;
      },
    };
  }, path);
}
