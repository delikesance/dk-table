/**
 * E2E (Chrome headless): text and logic functions as displayed by the UI.
 * LEFT RIGHT MID LEN TRIM UPPER LOWER TEXT IF IFERROR AND OR NOT ISNUMBER ISBLANK.
 * fr-FR TEXT output: decimal comma, U+00A0 thousands separator.
 */
import { test } from "@playwright/test";
import { scenario } from "./helpers-engine";

const NB = " ";
const data = { A1: "hello", A2: "5" };

const cases: [string, string, string][] = [
  ["LEFT", "=LEFT(A1,2)", "he"],
  ["LEFT default 1", "=LEFT(A1)", "h"],
  ["RIGHT", "=RIGHT(A1,3)", "llo"],
  ["MID", "=MID(A1,2,3)", "ell"],
  ["LEN", "=LEN(A1)", "5"],
  ["TRIM collapses spaces", '=TRIM("  a    b ")', "a b"],
  ["UPPER", "=UPPER(A1)", "HELLO"],
  ["LOWER", '=LOWER("ABC")', "abc"],
  ["TEXT 0.00", "=TEXT(3.14159,\"0.00\")", "3,14"],
  ["TEXT percent", '=TEXT(0.256,"0.0%")', "25,6%"],
  ["TEXT thousands", '=TEXT(1234567.891,"#,##0.00")', `1${NB}234${NB}567,89`],
  ["IF true", '=IF(A2>3,"big","small")', "big"],
  ["IF false", '=IF(A2>9,"big","small")', "small"],
  ["IFERROR catches", '=IFERROR(1/0,"oops")', "oops"],
  ["IFERROR passes value", '=IFERROR(4,"oops")', "4"],
  ["AND true", "=AND(A2>1,A2<10)", "TRUE"],
  ["AND false", "=AND(A2>1,A2<3)", "FALSE"],
  ["OR true", "=OR(A2>9,A2<10)", "TRUE"],
  ["OR false", "=OR(A2>9,A2<3)", "FALSE"],
  ["NOT", "=NOT(A2>9)", "TRUE"],
  ["ISNUMBER number", "=ISNUMBER(A2)", "TRUE"],
  ["ISNUMBER text", "=ISNUMBER(A1)", "FALSE"],
  ["ISBLANK empty", "=ISBLANK(Z9)", "TRUE"],
  ["ISBLANK filled", "=ISBLANK(A1)", "FALSE"],
];

for (const [name, formula, expected] of cases)
  test(`text/logic: ${name}`, async ({ page }) => {
    await scenario(page, { ...data, C1: formula }, { C1: expected });
  });
