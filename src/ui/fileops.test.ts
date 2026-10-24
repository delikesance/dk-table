// @vitest-environment jsdom
/** Tests for file actions: CSV sheet name, dirty confirmation, unload guard. */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../io/files", () => ({
  openDocument: vi.fn(), openPath: vi.fn(), saveAs: vi.fn(), saveDocument: vi.fn(),
  importCsvFile: vi.fn(), exportCsvFile: vi.fn(), exportFecFile: vi.fn(),
}));
import * as io from "../io/files";
import { exportFec, importCsv, installUnloadGuard, openFile, saveFile, setConfirm } from "./fileops";
import type { App } from "./appTypes";

const doc = { version: 1 as const, sheets: [] };
const csv = { cols: 1, rows: 1, cells: {} };
let active = { id: "s", name: "S", cols: 26, rows: 100, cells: {} as Record<string, { raw: string }> };

/** Minimal fake App recording the calls fileops makes. */
function fakeApp(dirty: boolean): App {
  const a = {
    dirty, path: undefined as string | undefined,
    loadDoc: vi.fn(), importSheet: vi.fn(), addRecent: vi.fn(), toDoc: () => doc,
    markSaved: vi.fn(() => { a.dirty = false; }),
    activeDoc: () => active,
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

describe("exportFec", () => {
  beforeEach(() => { vi.clearAllMocks(); document.body.innerHTML = ""; });
  const toast = () => document.querySelector(".dk-toast__msg")?.textContent;

  it("invalid sheet: one toast with the first error and the count, no file", async () => {
    active = { ...active, cells: { A1: { raw: "JournalCode" } } };
    await exportFec(fakeApp(false));
    expect(io.exportFecFile).not.toHaveBeenCalled();
    expect(document.querySelectorAll(".dk-toast")).toHaveLength(1);
    expect(toast()).toMatch(/^FEC invalide : Colonnes manquantes : JournalLib/);
  });

  it("several errors: first one plus (+N)", async () => {
    const { fecHeaderCells } = await import("../io/fec");
    active = { ...active, cells: { ...fecHeaderCells(), A2: { raw: "VE" }, A3: { raw: "VE" } } };
    await exportFec(fakeApp(false));
    expect(toast()).toMatch(/^FEC invalide : Ligne 2 : EcritureNum manquant \(\+\d+\)$/);
  });

  it("valid sheet: writes the FEC text", async () => {
    const { fecHeaderCells } = await import("../io/fec");
    const row = ["VE", "Ventes", "1", "2024-01-15", "411000", "Clients", "", "", "F1", "", "x", "0", "0", "", "", "2024-01-31", "", ""];
    const cells: Record<string, { raw: string }> = { ...fecHeaderCells() };
    row.forEach((v, i) => { if (v) cells[`${String.fromCharCode(65 + i)}2`] = { raw: v }; });
    active = { ...active, cells };
    await exportFec(fakeApp(false));
    expect(vi.mocked(io.exportFecFile).mock.calls[0][0]).toMatch(/^JournalCode\t[\s\S]*\r\nVE\tVentes\t1\t20240115\t/);
  });
});
