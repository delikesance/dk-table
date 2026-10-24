/** Tests of structural edits (insert/delete rows/cols) on raw cells: moves and formula reference rewriting. */
import { describe, expect, it } from "vitest";
import { deleteCols, deleteRows, insertCols, insertRows, moveKeys, rewriteFormula } from "./structure";

describe("cell moves", () => {
  it("insertRows shifts cells at/after the insertion row", () => {
    expect(insertRows({ A1: "1", A2: "2", B3: "3" }, 2, 1)).toEqual({ A1: "1", A3: "2", B4: "3" });
  });
  it("deleteRows drops deleted cells and pulls the rest up", () => {
    expect(deleteRows({ A1: "1", A2: "2", A3: "3", A5: "5" }, 2, 2)).toEqual({ A1: "1", A3: "5" });
  });
  it("insertCols / deleteCols move columns", () => {
    expect(insertCols({ A1: "a", B1: "b" }, 2, 2)).toEqual({ A1: "a", D1: "b" });
    expect(deleteCols({ A1: "a", B1: "b", C1: "c" }, 2, 1)).toEqual({ A1: "a", B1: "c" });
  });
  it("moveKeys moves any per-cell map (styles)", () => {
    expect(moveKeys({ A2: { bold: true } }, { axis: "row", at: 1, n: 1 })).toEqual({ A3: { bold: true } });
    expect(moveKeys({ A2: { bold: true }, A1: {} }, { axis: "row", at: 2, n: -1 })).toEqual({ A1: {} });
  });
});

describe("reference rewriting", () => {
  it("shifts refs after the insertion point", () => {
    expect(insertRows({ A3: "=A1+A2" }, 2, 1)).toEqual({ A4: "=A1+A3" });
    expect(insertCols({ C1: "=A1*B1" }, 1, 1)).toEqual({ D1: "=B1*C1" });
  });
  it("turns refs to deleted cells into #REF!", () => {
    expect(deleteRows({ A1: "=A2+A3" }, 2, 1)).toEqual({ A1: "=#REF!+A2" });
    expect(deleteCols({ A1: "=B1" }, 2, 1)).toEqual({ A1: "=#REF!" });
  });
  it("shrinks a range partially covering deleted rows", () => {
    expect(deleteRows({ B1: "=SUM(A1:A10)" }, 5, 1)).toEqual({ B1: "=SUM(A1:A9)" });
    expect(deleteRows({ B1: "=SUM(A3:A10)" }, 2, 3)).toEqual({ B1: "=SUM(A2:A7)" });
    expect(deleteRows({ B1: "=SUM(A3:A4)" }, 3, 2)).toEqual({ B1: "=SUM(#REF!)" });
  });
  it("grows a range when inserting inside it, shifts it when inserting before", () => {
    expect(insertRows({ B1: "=SUM(A1:A10)" }, 5, 2)).toEqual({ B1: "=SUM(A1:A12)" });
    expect(insertRows({ B1: "=SUM(A3:A4)" }, 2, 1)).toEqual({ B1: "=SUM(A4:A5)" });
    expect(insertRows({ B1: "=SUM(A3:A4)" }, 5, 1)).toEqual({ B1: "=SUM(A3:A4)" });
  });
  it("keeps $ markers while moving absolute refs", () => {
    expect(rewriteFormula("=$A$2+A$3+$B4", { axis: "row", at: 1, n: 1 })).toBe("=$A$3+A$4+$B5");
    expect(rewriteFormula("=SUM($A$1:$A$5)", { axis: "col", at: 1, n: 1 })).toBe("=SUM($B$1:$B$5)");
  });
  it("leaves string literals, function names and plain values alone", () => {
    expect(rewriteFormula('="A2"&A2', { axis: "row", at: 1, n: 1 })).toBe('="A2"&A3');
    expect(rewriteFormula("=LOG10(A2)", { axis: "row", at: 1, n: 1 })).toBe("=LOG10(A3)");
    expect(insertRows({ A1: "A2 text", A2: "'=A1" }, 1, 1)).toEqual({ A2: "A2 text", A3: "'=A1" });
  });
  it("is case-insensitive and normalizes refs to upper case", () => {
    expect(rewriteFormula("=a2", { axis: "row", at: 1, n: 1 })).toBe("=A3");
  });
});
