import { describe, expect, it, vi } from "vitest";
import { exportCsvFile, importCsvFile, openDocument, openPath, saveAs, saveDocument, type IoDeps } from "./files";
import { serialize } from "./format";
import type { DktDoc } from "./types";

const doc: DktDoc = { version: 1, sheets: [{ id: "a", name: "S", cols: 1, rows: 1, cells: {} }] };

const deps = (over: Partial<IoDeps> = {}): IoDeps => ({
  open: vi.fn(async () => "/x/a.dktable"),
  save: vi.fn(async () => "/x/b.dktable"),
  readTextFile: vi.fn(async () => serialize(doc)),
  writeTextFile: vi.fn(async () => {}),
  ...over,
});

describe("openDocument", () => {
  it("reads and parses chosen file", async () => {
    const d = deps();
    expect(await openDocument(d)).toEqual({ path: "/x/a.dktable", doc });
    expect(d.readTextFile).toHaveBeenCalledWith("/x/a.dktable");
  });
  it("returns null on cancel", async () => {
    expect(await openDocument(deps({ open: async () => null }))).toBeNull();
  });
  it("propagates parse errors", async () => {
    await expect(openDocument(deps({ readTextFile: async () => "bad" }))).rejects.toThrow(/JSON/);
  });
});

describe("saveDocument / saveAs", () => {
  it("writes to given path without dialog", async () => {
    const d = deps();
    expect(await saveDocument(doc, "/p.dktable", d)).toBe("/p.dktable");
    expect(d.save).not.toHaveBeenCalled();
    expect(d.writeTextFile).toHaveBeenCalledWith("/p.dktable", serialize(doc));
  });
  it("asks path when none", async () => {
    const d = deps();
    expect(await saveDocument(doc, undefined, d)).toBe("/x/b.dktable");
    expect(d.writeTextFile).toHaveBeenCalledWith("/x/b.dktable", serialize(doc));
  });
  it("returns null and writes nothing on cancel", async () => {
    const d = deps({ save: async () => null });
    expect(await saveAs(doc, d)).toBeNull();
    expect(d.writeTextFile).not.toHaveBeenCalled();
  });
  it("appends .dktable extension if missing", async () => {
    const d = deps({ save: async () => "/x/noext" });
    expect(await saveAs(doc, d)).toBe("/x/noext.dktable");
  });
});

describe("openPath / CSV files", () => {
  it("openPath parses a known path", async () => {
    expect(await openPath("/x/a.dktable", deps())).toEqual(doc);
  });
  it("importCsvFile reads the chosen csv", async () => {
    const d = deps({ open: async () => "/x/a.csv", readTextFile: async () => "a,b\n1,2" });
    const r = await importCsvFile(d);
    expect(r?.sheet.cells.B2).toEqual({ raw: "2" });
  });
  it("exportCsvFile writes csv with .csv extension", async () => {
    const d = deps({ save: async () => "/x/out" });
    const p = await exportCsvFile({ ...doc.sheets[0], cells: { A1: { raw: "x" } } }, d);
    expect(p).toBe("/x/out.csv");
    expect(d.writeTextFile).toHaveBeenCalledWith("/x/out.csv", "x");
  });
});
