import { describe, it, expect } from "vitest";
import { emptySheetOutline, setRowLevel, setColLevel, collapseRow, collapseCol, hiddenCols, hiddenRows, showRowLevel, showColLevel } from "./outlineState";
import { outlineToJson, outlineFromJson } from "./outlineFormat";
import { MAX_LEVEL } from "./outline";

describe("outline 8 niveaux", () => {
  it("accepte les niveaux 0 a 8 et rejette 9, -1 et les non-entiers", () => {
    expect(MAX_LEVEL).toBe(8);
    const s = emptySheetOutline(3, 3);
    expect(setRowLevel(s, 1, 8).rows.levels).toEqual([0, 8, 0]);
    expect(() => setRowLevel(s, 1, 9)).toThrow(RangeError);
    expect(() => setColLevel(s, 0, -1)).toThrow(RangeError);
    expect(() => setColLevel(s, 0, 2.5)).toThrow(RangeError);
  });

  it("garde l'etat plie/deplie des lignes et des colonnes separement", () => {
    let s = emptySheetOutline(3, 3);
    s = setRowLevel(s, 0, 1);
    s = setRowLevel(s, 1, 2);
    s = setColLevel(s, 0, 1);
    s = setColLevel(s, 1, 2);
    s = collapseRow(s, 2);
    expect(s.rows.collapsed).toHaveLength(1);
    expect(s.cols.collapsed).toHaveLength(0);
    expect([...hiddenRows(s)].sort()).toEqual([0, 1]);
    expect([...hiddenCols(s)]).toEqual([]);
    s = collapseCol(s, 2);
    expect([...hiddenCols(s)].sort()).toEqual([0, 1]);
    expect(s.rows.collapsed).toHaveLength(1);
  });

  it("serialise puis restaure a l'identique", () => {
    let s = emptySheetOutline(4, 4);
    s = setRowLevel(s, 0, 3);
    s = setRowLevel(s, 1, 1);
    s = setColLevel(s, 2, 5);
    s = collapseRow(s, 1);
    const json = JSON.parse(JSON.stringify(outlineToJson(s)));
    expect(outlineFromJson(json, 4, 4)).toEqual(s);
  });

  it("rejette a la restauration un niveau hors bornes ou un pli invalide", () => {
    const ok = outlineToJson(emptySheetOutline(2, 2));
    expect(() => outlineFromJson({ ...ok, rows: { levels: [9, 0], collapsed: [] } }, 2, 2)).toThrow(RangeError);
    expect(() => outlineFromJson({ ...ok, cols: { levels: [0, 0], collapsed: [{ row: 5, depth: 1 }] } }, 2, 2)).toThrow(RangeError);
    expect(() => outlineFromJson({}, 2, 2)).toThrow(RangeError);
  });
});

describe("plier un niveau", () => {
  it("masque les lignes et colonnes plus profondes et contigues", () => {
    let s = emptySheetOutline(4, 4);
    [0, 1].forEach((r) => (s = setRowLevel(s, r, 2)));
    s = setRowLevel(s, 2, 1);
    s = setColLevel(s, 1, 3);
    s = showRowLevel(s, 1);
    s = showColLevel(s, 0);
    expect([...hiddenRows(s)].sort()).toEqual([0, 1]);
    expect([...hiddenCols(s)].sort()).toEqual([1]);
  });
});
