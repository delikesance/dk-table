/** E2E: after "Enregistrer sous", an edit triggers an automatic write within ~1.5 s (fs mock, no manual save). */
import { test, expect } from "@playwright/test";
import { openApp, typeInCell } from "./helpers";
import { installIoMock, setNextSave, writes, readMock } from "./helpers-shell";

// Real gap: src/io/autosave.ts is not wired into the app yet (no createAutosave caller).
test.fixme("an edit after Save as is auto-written to the same file within 1.5 s", async ({ page }) => {
  await installIoMock(page);
  await openApp(page);
  await typeInCell(page, "A1", "1");
  await setNextSave(page, "/auto/doc.dktable");
  await page.keyboard.press("Control+Shift+s");
  await expect.poll(() => writes(page)).toHaveLength(1);
  await typeInCell(page, "A1", "2");
  await expect.poll(() => writes(page), { timeout: 1500 }).toHaveLength(2);
  expect(await readMock(page, "/auto/doc.dktable")).toContain('"2"');
});

test("no auto write before the file has a path", async ({ page }) => {
  await installIoMock(page);
  await openApp(page);
  await typeInCell(page, "A1", "1");
  await page.waitForTimeout(1800);
  expect(await writes(page)).toEqual([]);
});
