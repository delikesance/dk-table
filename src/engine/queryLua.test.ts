import { describe, it, expect } from "vitest";
import { createSheet, getRaw, setCell } from "./sheet";
import { runMacro, type MacroHost } from "../macros/lua";
import type { Step } from "./query";
import { queryToLua } from "./queryLua";

/** Exécute la macro générée sur une vraie feuille et relit la sortie (colonnes E..). */
function run(steps: Step[], rows: string[][]): string[][] {
  const s = createSheet();
  rows.forEach((r, i) => r.forEach((v, j) => setCell(s, `${"ABC"[j]}${i + 1}`, v)));
  const h = { getValue: () => 0, getDisplay: (r: string) => getRaw(s, r), getRaw: (r: string) => getRaw(s, r), getRangeValues: () => [], setCell: (r: string, v: string) => setCell(s, r, v), selection: () => "A1", select: () => {}, sheetName: () => "F" } as unknown as MacroHost;
  const res = runMacro(queryToLua(steps, `A1:C${rows.length}`), h);
  expect(res.error).toBeUndefined();
  return Array.from({ length: rows.length }, (_, i) => ["E", "F", "G", "H"].map((c) => getRaw(s, `${c}${i + 1}`)));
}
const T = [["R", "P", "Q"], ["N", "A", "2"], ["N", "A", "2"], ["S", "B", "5"]];

describe("queryToLua exécuté", () => {
  it("filtre + dédoublonne", () => {
    const out = run([{ kind: "dedupe" }, { kind: "filter", col: "Q", op: ">", value: "1" }], T);
    expect(out.slice(0, 3).map((r) => r.slice(0, 3))).toEqual([["R", "P", "Q"], ["N", "A", "2"], ["S", "B", "5"]]);
  });
  it("scinde", () => {
    const out = run([{ kind: "split", col: "P", delim: "-" }], [["R", "P", "Q"], ["N", "a-b", "1"]]);
    expect(out[1].slice(0, 4)).toEqual(["N", "a", "b", "1"]);
  });
});

describe("pivot en Lua", () => {
  it("somme par ligne + total", () => {
    const out = run([{ kind: "pivot", spec: { row: "R", value: "Q", agg: "SUM" } }], T);
    expect(out.map((r) => r.slice(0, 2))).toEqual([["R", "SUM Q"], ["N", "4"], ["S", "5"], ["Total", "9"]]);
  });
});
