/** E2E: poignée de recopie — glisser (bas, droite, haut), séries FR, Ctrl, aperçu, double-clic, annulation en un pas. */
import { test, expect, type Page } from "@playwright/test";
import { openApp, typeInCell, cell } from "./helpers";
import { selectRange } from "./helpers-edit";
import { fillColumn, readColumn } from "./helpers-new";

test.beforeEach(async ({ page }) => { await openApp(page); });

/** Drag the fill handle (bottom-right corner of the selection, at `from`) onto the middle of `to`; Ctrl held when asked. */
async function dragHandle(page: Page, from: string, to: string, ctrl = false): Promise<void> {
  const a = (await cell(page, from).boundingBox())!;
  const b = (await cell(page, to).boundingBox())!;
  await page.mouse.move(a.x + a.width - 3, a.y + a.height - 3);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 6 });
  if (ctrl) await page.keyboard.down("Control");
  await page.mouse.up();
  if (ctrl) await page.keyboard.up("Control");
}

test("glisser la poignée prolonge 1,2,3 vers le bas", async ({ page }) => {
  await fillColumn(page, "A", ["1", "2", "3"]);
  await selectRange(page, "A1", "A3");
  await dragHandle(page, "A3", "A6");
  expect(await readColumn(page, "A", 6)).toEqual(["1", "2", "3", "4", "5", "6"]);
  await expect(page.locator(".dkg-cell.dkg-range")).toHaveCount(6); // la sélection couvre la zone recopiée
});

test("l'aperçu s'affiche pendant le glisser puis disparaît", async ({ page }) => {
  await fillColumn(page, "A", ["1", "2"]);
  await selectRange(page, "A1", "A2");
  const a = (await cell(page, "A2").boundingBox())!;
  const b = (await cell(page, "A5").boundingBox())!;
  await page.mouse.move(a.x + a.width - 3, a.y + a.height - 3);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 5 });
  await expect(page.locator(".dkg-fp")).toHaveCount(3);
  await expect(page.locator(".dkg-fill-tip")).toHaveText("5");
  await page.mouse.up();
  await expect(page.locator(".dkg-fp")).toHaveCount(0);
  await expect(page.locator(".dkg-fill-tip")).toHaveCount(0);
});

test("mois FR vers la droite et jours vers le haut", async ({ page }) => {
  await typeInCell(page, "A1", "janvier");
  await cell(page, "A1").click();
  await dragHandle(page, "A1", "D1");
  expect(await cell(page, "D1").textContent()).toBe("avril");
  await typeInCell(page, "F5", "mercredi");
  await cell(page, "F5").click();
  await dragHandle(page, "F5", "F3");
  expect([await cell(page, "F4").textContent(), await cell(page, "F3").textContent()]).toEqual(["mardi", "lundi"]);
});

test("Item 1 -> Item 2…, un nombre seul est recopié, Ctrl en fait une série", async ({ page }) => {
  await typeInCell(page, "A1", "Item 1");
  await typeInCell(page, "B1", "9");
  await selectRange(page, "A1", "B1");
  await dragHandle(page, "B1", "B3");
  expect(await readColumn(page, "A", 3)).toEqual(["Item 1", "Item 2", "Item 3"]);
  expect(await readColumn(page, "B", 3)).toEqual(["9", "9", "9"]);
  await typeInCell(page, "D1", "9");
  await cell(page, "D1").click();
  await dragHandle(page, "D1", "D3", true);
  expect(await readColumn(page, "D", 3)).toEqual(["9", "10", "11"]);
});

test("dates ISO: pas d'un mois", async ({ page }) => {
  await fillColumn(page, "A", ["2024-01-31", "2024-02-29"]);
  await selectRange(page, "A1", "A2");
  await dragHandle(page, "A2", "A3");
  expect(await cell(page, "A3").textContent()).toBe("2024-03-31");
});

test("formules: références décalées; un seul Ctrl+Z annule toute la recopie", async ({ page }) => {
  await fillColumn(page, "A", ["1", "2", "3"]);
  await typeInCell(page, "B1", "=A1*10");
  await cell(page, "B1").click();
  await dragHandle(page, "B1", "B3");
  expect(await readColumn(page, "B", 3)).toEqual(["10", "20", "30"]);
  await page.keyboard.press("Control+z");
  expect(await readColumn(page, "B", 3)).toEqual(["10", "", ""]);
});

test("double-clic sur la poignée: descend jusqu'à la fin des données voisines", async ({ page }) => {
  await fillColumn(page, "A", ["a", "b", "c", "d"]);
  await typeInCell(page, "B1", "1");
  await typeInCell(page, "B2", "2");
  await selectRange(page, "B1", "B2");
  const b = (await cell(page, "B2").boundingBox())!;
  await page.mouse.dblclick(b.x + b.width - 3, b.y + b.height - 3);
  expect(await readColumn(page, "B", 5)).toEqual(["1", "2", "3", "4", ""]);
  await expect(page.locator(".dkg-editor")).toHaveCount(0);
});
