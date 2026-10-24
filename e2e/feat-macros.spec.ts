import { expect, test } from "@playwright/test";
import { cellText, openApp, typeInCell } from "./helpers";

/** Open the Scripts menu from the menu bar and click « Éditeur de macros ». */
async function openEditorFromMenu(page: import("@playwright/test").Page): Promise<void> {
  await page.locator('.dk-menu__trigger[title="Menu Scripts"]').click();
  await page.getByRole("menuitem", { name: /Éditeur de macros/ }).click();
}

test("Scripts > Éditeur de macros ouvre le panneau, la macro s'exécute sur la feuille", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await openApp(page);
  await typeInCell(page, "A1", "21");
  await openEditorFromMenu(page);
  await expect(page.locator(".dk-macros")).toBeVisible();
  await expect(page.locator(".dk-macros .cm-content")).toBeVisible();
  await page.locator(".dk-macros .cm-content").click();
  await page.keyboard.type('sheet.setCell("B1", sheet.getValue("A1") * 2)');
  await page.locator(".dk-macros__run").click();
  await expect.poll(() => cellText(page, "B1")).toBe("42");
  expect(errors).toEqual([]);
});

test("Alt+F11 ouvre puis ferme le panneau", async ({ page }) => {
  await openApp(page);
  await page.keyboard.press("Alt+F11");
  await expect(page.locator(".dk-macros")).toBeVisible();
  await page.keyboard.press("Alt+F11");
  await expect(page.locator(".dk-macros")).toBeHidden();
});
