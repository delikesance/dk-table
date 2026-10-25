import { describe, expect, it } from "vitest";
import { CANONICAL, fromLocale, syntaxFor, toLocale } from "./locale";

const FR = syntaxFor("fr-FR");
const EN = syntaxFor("en-US");

describe("syntaxFor", () => {
  it("uses ';' and ',' for decimal-comma languages", () => {
    expect(FR).toEqual({ argSep: ";", decimal: "," });
    expect(syntaxFor("de-DE")).toEqual({ argSep: ";", decimal: "," });
  });
  it("keeps the canonical syntax for decimal-point languages", () => {
    expect(EN).toEqual(CANONICAL);
    expect(CANONICAL).toEqual({ argSep: ",", decimal: "." });
  });
});

describe("toLocale", () => {
  it("is the identity in canonical syntax", () => {
    expect(toLocale("=SUM(A1,2.5)", CANONICAL)).toBe("=SUM(A1,2.5)");
  });
  it("turns argument separators and decimals into the fr syntax", () => {
    expect(toLocale("=SUM(A1,2.5)", FR)).toBe("=SUM(A1;2,5)");
    expect(toLocale("=IF(A1>0.5,B1,C1)", FR)).toBe("=IF(A1>0,5;B1;C1)");
  });
  it("leaves text that is not a formula alone", () => {
    expect(toLocale("2.5, ok", FR)).toBe("2.5, ok");
  });
  it("does not touch string literals", () => {
    expect(toLocale('=CONCAT("a,b.c",1.5)', FR)).toBe('=CONCAT("a,b.c";1,5)');
    expect(toLocale('=TEXT(A1,"0.00")', FR)).toBe('=TEXT(A1;"0.00")');
  });
  it("keeps quoted sheet names and error literals intact", () => {
    expect(toLocale("='Mes, chiffres'!A1+1.5", FR)).toBe("='Mes, chiffres'!A1+1,5");
    expect(toLocale("=#N/A+0.5", FR)).toBe("=#N/A+0,5");
  });
  it("keeps dotted function names (STDEV.S) and sheet refs", () => {
    expect(toLocale("=STDEV.S(Feuil1!A1,B2)", FR)).toBe("=STDEV.S(Feuil1!A1;B2)");
  });
  it("returns the input unchanged when it cannot be tokenized", () => {
    expect(toLocale('=SUM("abc', FR)).toBe('=SUM("abc');
  });
});

describe("fromLocale", () => {
  it("reads the fr syntax back to canonical", () => {
    expect(fromLocale("=SUM(A1;2,5)", FR)).toBe("=SUM(A1,2.5)");
  });
  it("round-trips every formula", () => {
    const samples = ["=A1*2", "=IF(A1>0,5;B1;\"x,y\")", "='Mes, chiffres'!B2;1,25", "=ROUND(2,345;2)"];
    for (const s of samples) expect(toLocale(fromLocale(s, FR), FR)).toBe(s);
    expect(fromLocale(toLocale("=MAX(1.5,2.25)", FR), FR)).toBe("=MAX(1.5,2.25)");
  });
  it("leaves plain text alone (no conversion of typed numbers)", () => {
    expect(fromLocale("2,5", FR)).toBe("2,5");
  });
});
