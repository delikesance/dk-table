import { test, expect } from "@playwright/test";
import { openApp, typeInCell, cellText } from "./helpers";

/** Smoke: the app mounts and recalculates a dependent formula. */
test("A1=2, B1==A1*3 displays 6", async ({ page }) => {
  await openApp(page);
  await typeInCell(page, "A1", "2");
  await typeInCell(page, "B1", "=A1*3");
  expect(await cellText(page, "B1")).toBe("6");
});
