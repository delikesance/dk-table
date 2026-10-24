import { describe, expect, it } from "vitest";
import { jumpAlong, navigate, pageRows, usedBounds, type NavEnv, type Sel } from "./nav";

const at = (col: number, row: number) => ({ col, row });
const one = (col: number, row: number): Sel => ({ anchor: at(col, row), active: at(col, row) });
/** Env over a set of filled "c,r" positions on a 10x20 sheet. */
const env = (filled: string[], order: number[] | null = null): NavEnv => {
  const s = new Set(filled);
  return { cols: 10, rows: 20, order, page: 5, filled: (c, r) => s.has(`${c},${r}`) };
};
// column 0: rows 2..4 filled, row 8 filled
const COL = ["0,2", "0,3", "0,4", "0,8"];

describe("jumpAlong (Excel Ctrl+arrow)", () => {
  const line = Array.from({ length: 20 }, (_, i) => i);
  const f = (r: number) => [2, 3, 4, 8].includes(r);
  it("from empty goes to the next filled cell", () => expect(jumpAlong(line, 0, 1, f)).toBe(2));
  it("inside a block goes to its last filled cell", () => expect(jumpAlong(line, 2, 1, f)).toBe(4));
  it("at a block end goes to the next block", () => expect(jumpAlong(line, 4, 1, f)).toBe(8));
  it("past the last value goes to the edge", () => expect(jumpAlong(line, 8, 1, f)).toBe(19));
  it("works backwards", () => {
    expect(jumpAlong(line, 19, -1, f)).toBe(8);
    expect(jumpAlong(line, 4, -1, f)).toBe(2);
    expect(jumpAlong(line, 2, -1, f)).toBe(0);
  });
  it("stays put at the edge", () => expect(jumpAlong(line, 0, -1, f)).toBe(0));
});

describe("navigate", () => {
  it("Ctrl+Down/Up use data blocks", () => {
    expect(navigate({ kind: "move", dc: 0, dr: 1, jump: true }, one(0, 0), false, env(COL)).active).toEqual(at(0, 2));
    expect(navigate({ kind: "move", dc: 0, dr: 1, jump: true }, one(0, 2), false, env(COL)).active).toEqual(at(0, 4));
    expect(navigate({ kind: "move", dc: 0, dr: -1, jump: true }, one(0, 8), false, env(COL)).active).toEqual(at(0, 4));
  });
  it("Ctrl+Right uses data blocks on the row", () => {
    const e = env(["3,1", "4,1"]);
    expect(navigate({ kind: "move", dc: 1, dr: 0, jump: true }, one(0, 1), false, e).active).toEqual(at(3, 1));
    expect(navigate({ kind: "move", dc: 1, dr: 0, jump: true }, one(3, 1), false, e).active).toEqual(at(4, 1));
    expect(navigate({ kind: "move", dc: 1, dr: 0, jump: true }, one(4, 1), false, e).active).toEqual(at(9, 1));
  });
  it("Ctrl+Down skips filtered rows", () => {
    expect(navigate({ kind: "move", dc: 0, dr: 1, jump: true }, one(0, 0), false, env(COL, [0, 1, 3, 4, 9])).active).toEqual(at(0, 3));
  });
  it("Shift extends, plain move collapses", () => {
    const s = navigate({ kind: "move", dc: 0, dr: 1, jump: true }, one(0, 0), true, env(COL));
    expect(s.anchor).toEqual(at(0, 0));
    expect(navigate({ kind: "move", dc: 1, dr: 0 }, s, false, env(COL))).toEqual(one(1, 2));
  });
  it("Home goes to column A, Ctrl+Home to A1, with Shift extending", () => {
    expect(navigate({ kind: "home" }, one(5, 7), false, env([]))).toEqual(one(0, 7));
    expect(navigate({ kind: "top" }, one(5, 7), true, env([]))).toEqual({ anchor: at(5, 7), active: at(0, 0) });
  });
  it("Ctrl+End goes to the last used row and column", () => {
    expect(navigate({ kind: "end" }, one(0, 0), false, env(["2,9", "6,1"]))).toEqual(one(6, 9));
    expect(navigate({ kind: "end" }, one(3, 3), false, env([]))).toEqual(one(0, 0));
  });
  it("PageDown/PageUp move one page of rows, clamped", () => {
    expect(navigate({ kind: "pageDown" }, one(1, 2), false, env([])).active).toEqual(at(1, 7));
    expect(navigate({ kind: "pageDown" }, one(1, 18), true, env([]))).toEqual({ anchor: at(1, 18), active: at(1, 19) });
    expect(navigate({ kind: "pageUp" }, one(1, 2), false, env([])).active).toEqual(at(1, 0));
  });
  it("Ctrl+A selects the used range, or the whole sheet when empty", () => {
    const s = navigate({ kind: "all" }, one(4, 4), false, env(["2,9", "6,1"]));
    expect([s.active, s.anchor]).toEqual([at(0, 0), at(6, 9)]);
    const e = navigate({ kind: "all" }, one(4, 4), false, env([]));
    expect([e.active, e.anchor]).toEqual([at(0, 0), at(9, 19)]);
  });
  it("Ctrl+Space selects the columns, Shift+Space the rows of the selection", () => {
    const sel: Sel = { anchor: at(1, 3), active: at(2, 5) };
    const c = navigate({ kind: "cols" }, sel, false, env([]));
    expect([c.anchor, c.active]).toEqual([at(1, 19), at(2, 0)]);
    const r = navigate({ kind: "rows" }, sel, false, env([]));
    expect([r.anchor, r.active]).toEqual([at(9, 3), at(0, 5)]);
  });
});

describe("usedBounds / pageRows", () => {
  it("usedBounds is null on an empty sheet", () => {
    expect(usedBounds(env([]))).toBeNull();
    expect(usedBounds(env(["2,9", "6,1"]))).toEqual(at(6, 9));
  });
  it("pageRows counts full rows under the header, at least 1", () => {
    expect(pageRows(600, 28)).toBe(20);
    expect(pageRows(10, 28)).toBe(1);
  });
});
