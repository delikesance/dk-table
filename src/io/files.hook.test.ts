import { afterEach, describe, expect, it, vi } from "vitest";
import { openDocument, saveAs } from "./files";
import { serialize } from "./format";
import type { DktDoc } from "./types";

const doc: DktDoc = { version: 1, sheets: [{ id: "a", name: "S", cols: 1, rows: 1, cells: {} }] };
const g = globalThis as { __DK_IO__?: unknown };

afterEach(() => { delete g.__DK_IO__; });

describe("window.__DK_IO__ test hook", () => {
  it("replaces the default Tauri deps when defined", async () => {
    const writeTextFile = vi.fn(async () => {});
    g.__DK_IO__ = {
      open: async () => "/m/a.dktable", save: async () => "/m/b",
      readTextFile: async () => serialize(doc), writeTextFile,
    };
    expect((await openDocument())?.path).toBe("/m/a.dktable");
    expect(await saveAs(doc)).toBe("/m/b.dktable");
    expect(writeTextFile).toHaveBeenCalled();
  });
});
