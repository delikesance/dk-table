/**
 * E2E (Chrome headless): conditional aggregates and lookups as displayed by the UI.
 * SUMIF SUMIFS COUNTIF COUNTIFS VLOOKUP HLOOKUP INDEX MATCH XLOOKUP.
 * Data: A1:A4 = a,b,a,c; B1:B4 = 1,2,3,4; D1:E3 = key/value table; G1:I2 = horizontal table.
 */
import { test } from "@playwright/test";
import { scenario } from "./helpers-engine";

const data = {
  A1: "a", A2: "b", A3: "a", A4: "c",
  B1: "1", B2: "2", B3: "3", B4: "4",
  D1: "1", D2: "2", D3: "3", E1: "x", E2: "y", E3: "z",
  G1: "1", H1: "2", I1: "3", G2: "p", H2: "q", I2: "r",
};

/** Blocked until branch wt/engine-matrix-na (2D range args + #N/A) is merged: 2D ranges give #REF!/#VALUE! today. */
const PENDING_MATRIX = new Set(["VLOOKUP exact", "HLOOKUP exact", "INDEX", "VLOOKUP not found", "MATCH not found"]);

const cases: [string, string, string][] = [
  ["SUMIF text criterion", '=SUMIF(A1:A4,"a",B1:B4)', "4"],
  ["SUMIF own range", '=SUMIF(B1:B4,">2")', "7"],
  ["SUMIFS", '=SUMIFS(B1:B4,A1:A4,"a",B1:B4,">1")', "3"],
  ["COUNTIF text", '=COUNTIF(A1:A4,"a")', "2"],
  ["COUNTIF operator", '=COUNTIF(B1:B4,">=2")', "3"],
  ["COUNTIF wildcard", '=COUNTIF(A1:A4,"?")', "4"],
  ["COUNTIF not equal", '=COUNTIF(A1:A4,"<>a")', "2"],
  ["COUNTIFS", '=COUNTIFS(A1:A4,"a",B1:B4,"<3")', "1"],
  ["VLOOKUP exact", "=VLOOKUP(2,D1:E3,2,FALSE)", "y"],
  ["HLOOKUP exact", "=HLOOKUP(3,G1:I2,2,FALSE)", "r"],
  ["INDEX", "=INDEX(D1:E3,2,2)", "y"],
  ["MATCH exact", "=MATCH(3,D1:D3,0)", "3"],
  ["XLOOKUP", "=XLOOKUP(3,D1:D3,E1:E3)", "z"],
  ["VLOOKUP not found", "=VLOOKUP(9,D1:E3,2,FALSE)", "#N/A"],
  ["MATCH not found", "=MATCH(9,D1:D3,0)", "#N/A"],
  ["IFNA around lookup", '=IFNA(VLOOKUP(9,D1:E3,2,FALSE),"none")', "none"],
  ["XLOOKUP not found", '=IFNA(XLOOKUP(9,D1:D3,E1:E3),"none")', "none"],
  ["IFERROR around lookup", '=IFERROR(VLOOKUP(9,D1:E3,2,FALSE),"none")', "none"],
];

for (const [name, formula, expected] of cases)
  test(`cond/lookup: ${name}`, async ({ page }) => {
    await scenario(page, { ...data, C1: formula }, { C1: expected });
  });
