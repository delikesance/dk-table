/**
 * E2E (Chrome headless): recalculation and error handling seen from the UI.
 * Chain and diamond dependents, #CYCLE! (direct/transitive, then resolved), #DIV/0!,
 * #NAME?, #REF!, apostrophe = text, `0x10` stays text, `A01` invalid, clearing a cell.
 */
import { test, expect } from "@playwright/test";
import { cell, cellText, openApp, selectCell } from "./helpers";
import { expectCells, fill, scenario } from "./helpers-engine";

test("recalc: chain A1 -> B1 -> C1", async ({ page }) => {
  await scenario(page, { A1: "1", B1: "=A1+1", C1: "=B1+1" }, { C1: "3" });
  await fill(page, { A1: "10" });
  await expectCells(page, { B1: "11", C1: "12" });
});

test("recalc: diamond D1 = B1 + C1 recomputed once per source change", async ({ page }) => {
  await scenario(page, { A1: "2", B1: "=A1+1", C1: "=A1*2", D1: "=B1+C1" }, { D1: "7" });
  await fill(page, { A1: "5" });
  await expectCells(page, { B1: "6", C1: "10", D1: "16" });
});

test("recalc: range dependents follow edits", async ({ page }) => {
  await scenario(page, { A1: "1", A2: "2", B1: "=SUM(A1:A2)" }, { B1: "3" });
  await fill(page, { A2: "9" });
  await expectCells(page, { B1: "10" });
});

test("recalc: direct cycle =A1 in A1 gives #CYCLE!", async ({ page }) => {
  await scenario(page, { A1: "=A1" }, { A1: "#CYCLE!" });
});

test("recalc: transitive cycle gives #CYCLE! on all members and dependents, then resolves", async ({ page }) => {
  await scenario(page, { A1: "=C1", B1: "=A1", C1: "=B1", D1: "=A1+1" }, { A1: "#CYCLE!", B1: "#CYCLE!", C1: "#CYCLE!" });
  expect(await cellText(page, "D1")).toBe("#CYCLE!");
  await fill(page, { C1: "5" });
  await expectCells(page, { A1: "5", B1: "5", C1: "5", D1: "6" });
});

test("recalc: #DIV/0! propagates to dependents", async ({ page }) => {
  await scenario(page, { A1: "=1/0", B1: "=A1+1" }, { A1: "#DIV/0!", B1: "#DIV/0!" });
});

test("recalc: unknown function gives #NAME?", async ({ page }) => {
  await scenario(page, { A1: "=NOSUCH(1)" }, { A1: "#NAME?" });
});

test("recalc: out-of-grid reference gives #REF!", async ({ page }) => {
  await scenario(page, { A1: "=ZZ999" }, { A1: "#REF!" });
});

test("recalc: leading apostrophe forces text", async ({ page }) => {
  await scenario(page, { A1: "'123", B1: "=ISNUMBER(A1)" }, { A1: "123", B1: "FALSE" });
});

test("recalc: 0x10 stays text, not 16", async ({ page }) => {
  await scenario(page, { A1: "0x10", B1: "=ISNUMBER(A1)" }, { A1: "0x10", B1: "FALSE" });
});

test("recalc: A01 is not a valid reference", async ({ page }) => {
  await scenario(page, { B1: "=A01" }, { B1: "#NAME?" });
});

test("recalc: clearing a cell recomputes dependents", async ({ page }) => {
  await scenario(page, { A1: "4", B1: "=A1*2" }, { B1: "8" });
  await selectCell(page, "A1");
  await page.keyboard.press("Delete");
  await expectCells(page, { A1: "", B1: "0" });
  expect(await cell(page, "A1").textContent()).toBe("");
});

test("recalc: opening the app twice starts from an empty grid", async ({ page }) => {
  await openApp(page);
  expect(await cellText(page, "A1")).toBe("");
});
