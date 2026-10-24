import type { Page } from "@playwright/test";

/** Mock of the Tauri dialog/fs layer through the `window.__DK_IO__` hook read by `src/io/files.ts`. */
declare global {
  interface Window {
    __e2e: { nextOpen: string | null; nextSave: string | null; writes: string[] };
  }
}

/**
 * Install the in-memory file system + dialog mock BEFORE `openApp`.
 * Files persist in sessionStorage (`e2e.fs`) so they survive a page reload.
 * Dialog answers are scripted with `setNextOpen` / `setNextSave` (null = cancel).
 */
export async function installIoMock(page: Page, files: Record<string, string> = {}): Promise<void> {
  await page.addInitScript((seed) => {
    const KEY = "e2e.fs";
    const load = (): Record<string, string> => JSON.parse(sessionStorage.getItem(KEY) ?? "null") ?? seed;
    const store = (fs: Record<string, string>) => sessionStorage.setItem(KEY, JSON.stringify(fs));
    const w = window as unknown as Window;
    w.__e2e = w.__e2e ?? { nextOpen: null, nextSave: null, writes: [] };
    (window as unknown as { __DK_IO__: unknown }).__DK_IO__ = {
      open: async () => w.__e2e.nextOpen,
      save: async () => w.__e2e.nextSave,
      readTextFile: async (p: string) => {
        const fs = load();
        if (!(p in fs)) throw new Error(`ENOENT ${p}`);
        return fs[p];
      },
      writeTextFile: async (p: string, d: string) => {
        store({ ...load(), [p]: d });
        w.__e2e.writes.push(p);
      },
    };
  }, files);
}

/** Script the next "open" dialog answer (path, or null to cancel). */
export const setNextOpen = (page: Page, path: string | null) => page.evaluate((p) => { window.__e2e.nextOpen = p; }, path);

/** Script the next "save" dialog answer (path, or null to cancel). */
export const setNextSave = (page: Page, path: string | null) => page.evaluate((p) => { window.__e2e.nextSave = p; }, path);

/** Content of a mock file, or undefined if never written. */
export const readMock = (page: Page, path: string) =>
  page.evaluate((p) => (JSON.parse(sessionStorage.getItem("e2e.fs") ?? "{}") as Record<string, string>)[p], path);

/** Paths written since page load, in order. */
export const writes = (page: Page) => page.evaluate(() => window.__e2e.writes.slice());

/** Make sure the N2 extras (Fichier menu, sort) + sidebar are deployed; the base bar is always visible. */
export async function ensureTools(page: Page): Promise<void> {
  if (await page.locator(".dk-toolbar__n2").isHidden()) await page.locator('[data-action="toggle-tools"]').click();
}

/** Run an entry of the single "Fichier" toolbar menu (CSV import/export live in it too) with the mouse. */
export async function menuAction(page: Page, menu: string, item: string): Promise<void> {
  await ensureTools(page);
  await page.locator(".dk-menu__trigger", { hasText: menu === "Import / Export" ? "Fichier" : menu }).click();
  await page.locator(".dk-menu__item", { hasText: item }).first().click();
}

/** Open the command palette with Ctrl+K and run the command typed as `query` (Enter). */
export async function runPalette(page: Page, query: string): Promise<void> {
  await page.keyboard.press("Control+k");
  await page.locator(".dk-palette__input").fill(query);
  await page.keyboard.press("Enter");
}

/** The visible toast ("Classeur remplacé" etc.); native confirm/alert dialogs are no longer used. */
export const toast = (page: Page) => page.locator(".dk-toast");

/** Click the toast action ("Annuler"). */
export const toastAction = (page: Page) => page.locator(".dk-toast__action").click();

/** Current document title (carries the file name and the dirty marker). */
export const title = (page: Page) => page.title();
