import { test, expect } from "@playwright/test";
import { openApp, selectCell, typeInCell } from "./helpers";
import { css, mockFiles } from "./helpers-edit";

/** E2E couleurs personnalisées: fond et texte via le sélecteur natif, puis réutilisation depuis « Couleurs du document ». */
test.beforeEach(async ({ page }) => {
  await mockFiles(page);
  await openApp(page);
});

const open = async (page: import("@playwright/test").Page, label: string) =>
  page.locator(".dk-colorwrap").getByRole("button", { name: label, exact: true }).first().click();
const picker = (page: import("@playwright/test").Page, label: string) => page.locator(`.dk-colorwrap .color-picker[aria-label="${label}"]`);

test("une couleur de fond personnalisée s'applique à la cellule", async ({ page }) => {
  await typeInCell(page, "A1", "x");
  await selectCell(page, "A1");
  await open(page, "Couleur de fond");
  await picker(page, "Couleur de fond").locator('input[type="color"]').fill("#12ab34");
  expect(await css(page, "A1", "background-color")).toBe("rgb(18, 171, 52)");
});

test("une couleur de texte personnalisée s'applique, puis se réutilise ailleurs depuis « Couleurs du document »", async ({ page }) => {
  await typeInCell(page, "A1", "x");
  await typeInCell(page, "B2", "y");
  await selectCell(page, "A1");
  await open(page, "Couleur du texte");
  await picker(page, "Couleur du texte").locator('input[type="color"]').fill("#aa2266");
  expect(await css(page, "A1", "color")).toBe("rgb(170, 34, 102)");
  await selectCell(page, "B2");
  await open(page, "Couleur du texte");
  await expect(picker(page, "Couleur du texte").getByText("Couleurs du document")).toBeVisible();
  await picker(page, "Couleur du texte").getByRole("button", { name: "#aa2266" }).click();
  expect(await css(page, "B2", "color")).toBe("rgb(170, 34, 102)");
});

test("une couleur personnalisée survit à l'enregistrement / ouverture", async ({ page }) => {
  page.on("dialog", (d) => void d.accept());
  await typeInCell(page, "A1", "x");
  await selectCell(page, "A1");
  await open(page, "Couleur de fond");
  await picker(page, "Couleur de fond").locator('input[type="color"]').fill("#12ab34");
  await page.locator(".dkg").focus();
  await page.keyboard.press("Control+s");
  await expect.poll(() => page.evaluate(() => Object.keys((window as unknown as { __files: object }).__files).length)).toBe(1);
  const saved = await page.evaluate(() => Object.values((window as unknown as { __files: Record<string, string> }).__files)[0]);
  expect(JSON.parse(saved).sheets[0].styles.A1.fill).toBe("#12ab34");
});
