import { describe, it, expect } from "vitest";
import { emptyHistory, recordChanges, cellHistory, timeline, rewind, addSnapshot, snapshotDoc, MAX_LOG } from "./history";
import { parse, serialize } from "./format";
import type { DktDoc } from "./types";

const d = (cells: Record<string, string>, extra: Partial<DktDoc> = {}): DktDoc => ({
  version: 1, ...extra,
  sheets: [{ id: "s1", name: "A", cols: 26, rows: 100, cells: Object.fromEntries(Object.entries(cells).map(([k, raw]) => [k, { raw }])) }],
});

describe("history", () => {
  it("records per-cell changes between two states", () => {
    const h = recordChanges(emptyHistory(), d({ A1: "1", B1: "x" }), d({ A1: "2", C1: "=A1" }), 100);
    expect(h.log).toEqual([
      { t: 100, sheet: "s1", key: "A1", from: "1", to: "2" },
      { t: 100, sheet: "s1", key: "B1", from: "x", to: "" },
      { t: 100, sheet: "s1", key: "C1", from: "", to: "=A1" },
    ]);
    expect(recordChanges(h, d({ A1: "2" }), d({ A1: "2" }), 200).log.length).toBe(3);
  });
  it("cell history, newest last", () => {
    let h = recordChanges(emptyHistory(), d({ A1: "1" }), d({ A1: "2" }), 1);
    h = recordChanges(h, d({ A1: "2" }), d({ A1: "3" }), 2);
    expect(cellHistory(h, "s1", "A1").map((e) => e.to)).toEqual(["2", "3"]);
    expect(timeline(h)).toEqual([1, 2]);
  });
  it("rewind restores the state at a given time", () => {
    const v1 = d({ A1: "1" }), v2 = d({ A1: "2", B1: "n" }), v3 = d({ A1: "3", B1: "n" });
    let h = recordChanges(emptyHistory(), v1, v2, 10);
    h = recordChanges(h, v2, v3, 20);
    expect(rewind(v3, h, 10).sheets[0].cells).toEqual({ A1: { raw: "2" }, B1: { raw: "n" } });
    expect(rewind(v3, h, 5).sheets[0].cells).toEqual({ A1: { raw: "1" } });
    expect(rewind(v3, h, 20).sheets[0].cells).toEqual(v3.sheets[0].cells);
  });
  it("named snapshots restore cells and are capped log", () => {
    const h = addSnapshot(emptyHistory(), d({ A1: "9" }), "Clôture", 50);
    expect(h.snaps[0]).toMatchObject({ name: "Clôture", t: 50 });
    expect(snapshotDoc(h.snaps[0], d({ A1: "1", Z9: "z" })).sheets[0].cells).toEqual({ A1: { raw: "9" } });
    let big = emptyHistory();
    for (let i = 0; i < MAX_LOG + 10; i++) big = recordChanges(big, d({}), d({ A1: String(i) }), i);
    expect(big.log.length).toBe(MAX_LOG);
  });
  it("is persisted in the file", () => {
    const h = addSnapshot(recordChanges(emptyHistory(), d({}), d({ A1: "1" }), 1), d({ A1: "1" }), "v1", 2);
    expect(parse(serialize(d({ A1: "1" }, { history: h }))).history).toEqual(h);
    expect(() => parse(serialize(d({}, { history: { log: [{ t: "x" }], snaps: [] } as never })))).toThrow(/history/);
  });
});
