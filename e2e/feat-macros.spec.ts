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

const SAMPLE = '-- note\nlocal n = 12\nprint(sheet.getValue("A1"), nil)';

/** Computed color of the first token whose text is `text` in the macro editor. */
const colorOf = (page: import("@playwright/test").Page, text: string) =>
  page.evaluate((t) => {
    const el = [...document.querySelectorAll(".dk-macros .cm-line span")].find((s) => s.textContent === t);
    return el ? getComputedStyle(el).color : "absent";
  }, text);

for (const theme of ["light", "dark"]) {
  test(`coloration syntaxique : une couleur distincte par catégorie (thème ${theme})`, async ({ page }) => {
    await openApp(page);
    await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
    await page.keyboard.press("Alt+F11");
    await page.locator(".dk-macros .cm-content").click();
    await page.keyboard.insertText(SAMPLE);
    const plain = await colorOf(page, "n");
    const cats = await Promise.all(["local", '"A1"', "12", "-- note", "sheet", "getValue", "nil"].map((t) => colorOf(page, t)));
    const [keyword, string, number, comment, builtin, member, constant] = cats;
    for (const c of cats) expect(c).not.toBe("absent");
    // every category differs from plain text, and the main categories differ from each other
    for (const c of cats) expect(c).not.toBe(plain);
    expect(new Set([keyword, string, number, comment, builtin, member]).size).toBe(6);
    expect(constant).toBe(number);
  });
}

test("autocomplétion : popup visible, description, insertion avec parenthèses", async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 600 });
  await openApp(page);
  await page.keyboard.press("Alt+F11");
  await page.locator(".dk-macros .cm-content").click();
  await page.keyboard.type("sheet.get");
  const popup = page.locator(".cm-tooltip-autocomplete");
  await expect(popup).toBeVisible();
  await expect(popup.locator("li")).toHaveCount(4);
  await page.waitForTimeout(250); // CodeMirror ignores keys for a short moment after the popup opens
  await page.keyboard.press("ArrowDown");
  await expect(page.locator(".cm-completionInfo")).toContainText("getRangeValues(range)");
  // fully on screen, painted above the rest of the page (not clipped by the panel)
  const box = (await popup.boundingBox())!;
  expect(box.x + box.width).toBeLessThanOrEqual(1100);
  expect(box.y + box.height).toBeLessThanOrEqual(600);
  const top = await page.evaluate(([x, y]) => !!document.elementFromPoint(x, y)?.closest(".cm-tooltip-autocomplete"), [box.x + 20, box.y + 8]);
  expect(top).toBe(true);
  // selected row = accent fill, same as the Run button (not CodeMirror's default blue)
  const sel = await popup.locator("li[aria-selected]").evaluate((li) => getComputedStyle(li).backgroundColor);
  expect(sel).toBe(await page.locator(".dk-macros__run").evaluate((b) => getComputedStyle(b).backgroundColor));
  await page.keyboard.press("Enter");
  await expect(page.locator(".dk-macros .cm-content")).toHaveText("sheet.getRangeValues()");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Control+a");
  await page.keyboard.press("Delete");
  await page.keyboard.type("pr");
  await expect(popup).toContainText("print");
});
