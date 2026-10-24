/** Tests for file actions: CSV sheet name, dirty confirmation, unload guard. */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../io/files", () => ({
  openDocument: vi.fn(), openPath: vi.fn(), saveAs: vi.fn(), saveDocument: vi.fn(),
  importCsvFile: vi.fn(), exportCsvFile: vi.fn(),
}));
import * as io from "../io/files";
import { importCsv, installUnloadGuard, openFile, saveFile, setConfirm } from "./fileops";
import type { App } from "./appTypes";

const doc = { version: 1 as const, sheets: [] };
const csv = { cols: 1, rows: 1, cells: {} };

/** Minimal fake App recording the calls fileops makes. */
function fakeApp(dirty: boolean): App {
  const a = {
    dirty, path: undefined as string | undefined,
    loadDoc: vi.fn(), importSheet: vi.fn(), addRecent: vi.fn(), toDoc: () => doc,
    markSaved: vi.fn(() => { a.dirty = false; }),
  };
  return a as unknown as App;
}

describe("fileops", () => {
  beforeEach(() => { vi.clearAllMocks(); setConfirm(() => true); });

  it.each([["C:\\me\\data.csv"], ["/home/me/data.csv"]])("CSV sheet name from %s", async (p) => {
    vi.mocked(io.importCsvFile).mockResolvedValue({ path: p, sheet: csv } as never);
    const app = fakeApp(false);
    await importCsv(app);
    expect(app.importSheet).toHaveBeenCalledWith("data", csv);
  });

  it("open keeps the workbook when dirty and confirm is refused", async () => {
    vi.mocked(io.openDocument).mockResolvedValue({ doc, path: "a.dktable" } as never);
    setConfirm(() => false);
    const app = fakeApp(true);
    await openFile(app);
    expect(app.loadDoc).not.toHaveBeenCalled();
  });

  it("open overwrites when dirty and confirm is accepted", async () => {
    vi.mocked(io.openDocument).mockResolvedValue({ doc, path: "a.dktable" } as never);
    const app = fakeApp(true);
    await openFile(app);
    expect(app.loadDoc).toHaveBeenCalled();
  });

  it("open does not ask when clean", async () => {
    vi.mocked(io.openDocument).mockResolvedValue({ doc, path: "a.dktable" } as never);
    const ask = vi.fn(() => false);
    setConfirm(ask);
    await openFile(fakeApp(false));
    expect(ask).not.toHaveBeenCalled();
  });

  it("save clears dirty", async () => {
    vi.mocked(io.saveAs).mockResolvedValue("x.dktable");
    const app = fakeApp(true);
    await saveFile(app, true);
    expect(app.dirty).toBe(false);
  });

  it("beforeunload is prevented only when dirty", () => {
    const app = fakeApp(true);
    installUnloadGuard(app);
    const ev = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
    (app as { dirty: boolean }).dirty = false;
    const ev2 = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(ev2);
    expect(ev2.defaultPrevented).toBe(false);
  });
});
