/**
 * E2E (Chrome headless): math functions as displayed by the UI.
 * SUM AVERAGE MIN MAX COUNT ABS ROUND CONCAT PRODUCT MOD MEDIAN COUNTA.
 * Data A1:A4 = 1,2,3,6 and A5 = "x" (text, ignored by numeric aggregates).
 */
import { test } from "@playwright/test";
import { scenario } from "./helpers-engine";

const data = { A1: "1", A2: "2", A3: "3", A4: "6", A5: "x" };

const cases: [string, string, string][] = [
  ["SUM", "=SUM(A1:A4)", "12"],
  ["SUM mixed args", "=SUM(A1:A2,10)", "13"],
  ["AVERAGE", "=AVERAGE(A1:A4)", "3"],
  ["MIN", "=MIN(A1:A4)", "1"],
  ["MAX", "=MAX(A1:A4)", "6"],
  ["COUNT ignores text", "=COUNT(A1:A5)", "4"],
  ["ABS", "=ABS(-4.5)", "4.5"],
  ["ROUND", "=ROUND(2.567,2)", "2.57"],
  ["ROUND negative digits", "=ROUND(1234,-2)", "1200"],
  ["CONCAT", '=CONCAT("a",A1,"b")', "a1b"],
  ["PRODUCT", "=PRODUCT(A1:A4)", "36"],
  ["MOD", "=MOD(10,3)", "1"],
  ["MEDIAN even", "=MEDIAN(A1:A4)", "2.5"],
  ["COUNTA counts text", "=COUNTA(A1:A5)", "5"],
  ["decimal noise trimmed", "=0.1+0.2", "0.3"],
];

for (const [name, formula, expected] of cases)
  test(`math: ${name}`, async ({ page }) => {
    await scenario(page, { ...data, C1: formula }, { C1: expected });
  });

test("math: MOD by zero gives #DIV/0!", async ({ page }) => {
  await scenario(page, { C1: "=MOD(5,0)" }, { C1: "#DIV/0!" });
});
