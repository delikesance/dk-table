import { describe, it, expect, beforeEach } from "vitest";
import { loadHistory, stampSave, currentHistory, takeSnapshot, historyField, setBaseline } from "./store";
import type { DktDoc } from "../../io/types";

const d = (cells: Record<string, string>): DktDoc => ({
  version: 1, sheets: [{ id: "s1", name: "A", cols: 26, rows: 100, cells: Object.fromEntries(Object.entries(cells).map(([k, raw]) => [k, { raw }])) }],
});

describe("history store", () => {
  beforeEach(() => loadHistory(d({ A1: "1" })));
  it("stamps changes since load at save time, once", () => {
    const out = stampSave(d({ A1: "2" }), 10);
    expect(out.history!.log).toEqual([{ t: 10, sheet: "s1", key: "A1", from: "1", to: "2" }]);
    expect(stampSave(d({ A1: "2" }), 20).history!.log.length).toBe(1);
  });
  it("loads the file's history and exposes it for toDoc", () => {
    const h = { log: [{ t: 1, sheet: "s1", key: "A1", from: "", to: "1" }], snaps: [] };
    loadHistory({ ...d({ A1: "1" }), history: h });
    expect(currentHistory()).toEqual(h);
    expect(historyField()).toEqual({ history: h });
  });
  it("no history field while nothing was recorded", () => {
    expect(historyField()).toEqual({});
  });
  it("snapshots keep the baseline untouched", () => {
    takeSnapshot(d({ A1: "5" }), "v1", 7);
    expect(currentHistory().snaps[0].name).toBe("v1");
    setBaseline(d({ A1: "5" }));
    expect(stampSave(d({ A1: "5" }), 8).history!.log).toEqual([]);
  });
});
