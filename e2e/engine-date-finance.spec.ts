/**
 * E2E (Chrome headless): date and finance functions as displayed by the UI.
 * DATE YEAR MONTH DAY (TODAY/NOW: shape only) PMT NPV IRR.
 * Dates are Excel serials (1900 system); 2024-03-15 = 45366.
 */
import { test, expect } from "@playwright/test";
import { cellText, openApp } from "./helpers";
import { fill, scenario } from "./helpers-engine";

const cases: [string, Record<string, string>, string][] = [
  ["DATE serial", { C1: "=DATE(2024,3,15)" }, "45366"],
  ["DATE month overflow", { C1: "=DATE(2024,14,1)" }, "45689"],
  ["YEAR", { C1: "=YEAR(DATE(2024,3,15))" }, "2024"],
  ["MONTH", { C1: "=MONTH(DATE(2024,3,15))" }, "3"],
  ["DAY", { C1: "=DAY(DATE(2024,3,15))" }, "15"],
  ["YEAR of literal serial", { A1: "45366", C1: "=YEAR(A1)" }, "2024"],
  ["PMT zero rate", { C1: "=PMT(0,10,1000)" }, "-100"],
  ["PMT rounded", { C1: "=ROUND(PMT(0.01,12,1000),2)" }, "-88.85"],
  ["NPV", { C1: "=ROUND(NPV(0.1,110,121),4)" }, "200"],
  ["NPV range", { A1: "110", A2: "121", C1: "=ROUND(NPV(0.1,A1:A2),4)" }, "200"],
  ["IRR", { A1: "-100", A2: "110", C1: "=ROUND(IRR(A1:A2),4)" }, "0.1"],
  ["IRR needs both signs", { A1: "100", A2: "110", C1: "=IRR(A1:A2)" }, "#NUM!"],
];

for (const [name, data, expected] of cases)
  test(`date/finance: ${name}`, async ({ page }) => {
    await scenario(page, data, { C1: expected });
  });

test("date/finance: TODAY is an integer serial, NOW has the same integer part", async ({ page }) => {
  await openApp(page);
  await fill(page, { C1: "=TODAY()", C2: "=NOW()", C3: "=INT(C2)-C1" });
  expect(await cellText(page, "C1")).toMatch(/^\d{5}$/);
  expect(await cellText(page, "C2")).toMatch(/^\d{5}(\.\d+)?$/);
});
