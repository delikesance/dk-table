/** Tests for the FEC export (art. A47 A-1 LPF): column order, formatting, dates, formulas, validation. */
import { describe, expect, it } from "vitest";
import { FEC_COLUMNS, fecHeaderCells, toFec } from "./fec";
import type { DocSheet } from "./types";

const col = (i: number) => String.fromCharCode(65 + i);

/** Builds a DocSheet from row arrays (row 1 = header); "" cells are left out. */
function sheet(rows: string[][]): DocSheet {
  const cells: DocSheet["cells"] = {};
  rows.forEach((r, ri) => r.forEach((v, ci) => { if (v !== "") cells[`${col(ci)}${ri + 1}`] = { raw: v }; }));
  return { id: "s", name: "S", cols: 26, rows: 100, cells };
}

/** One full line in FEC order, overridable by column name. */
function line(over: Record<string, string> = {}): string[] {
  const base: Record<string, string> = {
    JournalCode: "VE", JournalLib: "Ventes", EcritureNum: "1", EcritureDate: "2024-01-15",
    CompteNum: "411000", CompteLib: "Clients", CompAuxNum: "", CompAuxLib: "", PieceRef: "F1",
    PieceDate: "15/01/2024", EcritureLib: "Facture F1", Debit: "120", Credit: "",
    EcritureLet: "", DateLet: "", ValidDate: "2024-01-31", Montantdevise: "", Idevise: "",
  };
  return FEC_COLUMNS.map((c) => over[c] ?? base[c]);
}
const credit = (over: Record<string, string> = {}) =>
  line({ CompteNum: "706000", CompteLib: "Ventes", Debit: "", Credit: "120", ...over });

const ok = (s: DocSheet) => {
  const r = toFec(s);
  if (!("text" in r)) throw new Error(r.errors.join("\n"));
  return r.text.split("\r\n");
};
const errs = (s: DocSheet) => {
  const r = toFec(s);
  return "errors" in r ? r.errors : [];
};

describe("toFec output", () => {
  it("header + one TAB-separated line per data row, CRLF", () => {
    const r = toFec(sheet([[...FEC_COLUMNS], line(), credit()]));
    expect("text" in r && r.text.endsWith("\r\n")).toBe(true);
    const lines = ok(sheet([[...FEC_COLUMNS], line(), credit()]));
    expect(lines[0]).toBe(FEC_COLUMNS.join("\t"));
    expect(lines).toHaveLength(4); // header, 2 rows, trailing ""
    expect(lines[1].split("\t")).toEqual([
      "VE", "Ventes", "1", "20240115", "411000", "Clients", "", "", "F1",
      "20240115", "Facture F1", "120,00", "0,00", "", "", "20240131", "", "",
    ]);
  });
  it("columns in any order, case-insensitive, extra columns ignored", () => {
    const names = [...FEC_COLUMNS].reverse().map((c) => c.toLowerCase());
    const rows = [line(), credit()].map((r) => [...r].reverse());
    const lines = ok(sheet([["Note", ...names], ["x", ...rows[0]], ["y", ...rows[1]]]));
    expect(lines[0]).toBe(FEC_COLUMNS.join("\t"));
    expect(lines[1].split("\t")[0]).toBe("VE");
    expect(lines[1]).not.toContain("x");
  });
  it("skips empty rows", () => {
    expect(ok(sheet([[...FEC_COLUMNS], line(), [], credit()]))).toHaveLength(4);
  });
  it("amounts: comma, 2 decimals, no thousands separator; Montantdevise empty stays empty", () => {
    const f = ok(sheet([[...FEC_COLUMNS], line({ Debit: "1234567.5", Montantdevise: "10.456", Idevise: "USD" }),
      credit({ Credit: "1234567.5" })]))[1].split("\t");
    expect(f[11]).toBe("1234567,50");
    expect(f[12]).toBe("0,00");
    expect(f[16]).toBe("10,46");
    expect(ok(sheet([[...FEC_COLUMNS], line(), credit()]))[2].split("\t")[16]).toBe("");
  });
  it("dates from 1900 serials and text (ISO, JJ/MM/AAAA, AAAAMMJJ)", () => {
    const f = ok(sheet([[...FEC_COLUMNS],
      line({ EcritureDate: "45306", PieceDate: "2024-02-29", ValidDate: "20240131", DateLet: "01/03/2024" }), credit()]))[1].split("\t");
    expect([f[3], f[9], f[15], f[14]]).toEqual(["20240115", "20240229", "20240131", "20240301"]);
  });
  it("formulas export their computed values", () => {
    const f = ok(sheet([[...FEC_COLUMNS],
      line({ Debit: "=100+20", EcritureDate: "=DATE(2024,1,15)", EcritureLib: '="Fac"&"ture"' }), credit()]))[1].split("\t");
    expect([f[11], f[3], f[10]]).toEqual(["120,00", "20240115", "Facture"]);
  });
  it("text fields keep leading zeros and lose TAB/CR/LF", () => {
    const f = ok(sheet([[...FEC_COLUMNS], line({ CompteNum: "0411", EcritureLib: "a\tb\r\nc" }),
      credit()]))[1].split("\t");
    expect(f[4]).toBe("0411");
    expect(f[10]).toBe("a b c");
  });
});

describe("toFec validation", () => {
  it("lists missing required columns", () => {
    const e = errs(sheet([FEC_COLUMNS.filter((c) => c !== "Debit" && c !== "Idevise"), []]));
    expect(e).toEqual(["Colonnes manquantes : Debit, Idevise"]);
  });
  it.each(["EcritureDate", "ValidDate"])("invalid or missing %s", (c) => {
    expect(errs(sheet([[...FEC_COLUMNS], line({ [c]: "31/02/2024" }), credit()]))).toEqual([`Ligne 2 : ${c} invalide`]);
    expect(errs(sheet([[...FEC_COLUMNS], line({ [c]: "" }), credit()]))).toEqual([`Ligne 2 : ${c} manquant`]);
  });
  it.each(["CompteNum", "JournalCode", "EcritureNum"])("missing %s", (c) => {
    const e = errs(sheet([[...FEC_COLUMNS], line(), credit({ [c]: "" })]));
    expect(e[0]).toBe(`Ligne 3 : ${c} manquant`);
  });
  it("debit and credit on the same row", () => {
    expect(errs(sheet([[...FEC_COLUMNS], line({ Credit: "5" }), credit({ Credit: "115" })])))
      .toEqual(["Ligne 2 : Debit et Credit renseignés"]);
  });
  it("unbalanced entry, to the cent", () => {
    expect(errs(sheet([[...FEC_COLUMNS], line({ Debit: "120.01" }), credit()])))
      .toEqual(["Écriture 1 déséquilibrée : débit 120,01, crédit 120,00"]);
    expect(errs(sheet([[...FEC_COLUMNS], line({ Debit: "=0.1+0.2" }), credit({ Credit: "0.3" })]))).toEqual([]);
  });
  it("invalid amount and error values", () => {
    expect(errs(sheet([[...FEC_COLUMNS], line({ Debit: "abc" }), credit()]))[0]).toBe("Ligne 2 : Debit invalide");
    expect(errs(sheet([[...FEC_COLUMNS], line({ CompteLib: "=1/0" }), credit()]))[0]).toBe("Ligne 2 : CompteLib en erreur (#DIV/0!)");
  });
  it("no data rows", () => {
    expect(errs(sheet([[...FEC_COLUMNS]]))).toEqual(["Aucune écriture"]);
  });
});

describe("fecHeaderCells", () => {
  it("A1..R1 hold the 18 names in order", () => {
    const h = fecHeaderCells();
    expect(Object.keys(h)).toHaveLength(18);
    expect(h.A1).toEqual({ raw: "JournalCode" });
    expect(h.R1).toEqual({ raw: "Idevise" });
  });
});
