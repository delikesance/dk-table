// @vitest-environment jsdom
/** Tests for fileops toasts: no native dialogs, errors as toasts, "Classeur remplacé" + Annuler. */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../io/files", () => ({
  openDocument: vi.fn(), openPath: vi.fn(), saveAs: vi.fn(), saveDocument: vi.fn(),
  importCsvFile: vi.fn(), exportCsvFile: vi.fn(),
}));
import * as io from "../io/files";
import { newDocument, openFile, saveFile, setConfirm } from "./fileops";
import type { App } from "./appTypes";

const doc = { version: 1 as const, sheets: [] };
const prev = { version: 1 as const, sheets: [{ id: "p" }] } as never;

/** Minimal fake App recording the calls fileops makes. */
function fakeApp(dirty: boolean): App {
  return {
    dirty, path: "old.dktable" as string | undefined,
    loadDoc: vi.fn(), addRecent: vi.fn(), markSaved: vi.fn(), toDoc: () => prev,
  } as unknown as App;
}
const toast = () => document.querySelector<HTMLElement>(".dk-toast");

describe("fileops toasts", () => {
  beforeEach(() => { vi.clearAllMocks(); setConfirm(() => true); document.body.innerHTML = ""; });

  it("never calls native confirm/alert", async () => {
    const c = vi.spyOn(window, "confirm"), a = vi.spyOn(window, "alert").mockImplementation(() => {});
    vi.mocked(io.openDocument).mockRejectedValue(new Error("boom"));
    await openFile(fakeApp(true));
    expect(c).not.toHaveBeenCalled(); expect(a).not.toHaveBeenCalled();
    c.mockRestore(); a.mockRestore();
  });

  it("open errors become a toast without action button", async () => {
    vi.mocked(io.openDocument).mockRejectedValue(new Error("boom"));
    await openFile(fakeApp(false));
    expect(toast()!.textContent).toContain("boom");
    expect(toast()!.querySelector("button")).toBeNull();
  });

  it("save errors become a toast", async () => {
    vi.mocked(io.saveAs).mockRejectedValue(new Error("disque plein"));
    await saveFile(fakeApp(true), true);
    expect(toast()!.textContent).toContain("disque plein");
  });

  it("open shows 'Classeur remplacé'; Annuler restores the previous workbook", async () => {
    vi.mocked(io.openDocument).mockResolvedValue({ doc, path: "a.dktable" } as never);
    const app = fakeApp(true);
    await openFile(app);
    expect(app.loadDoc).toHaveBeenLastCalledWith(doc, "a.dktable");
    expect(toast()!.textContent).toContain("Classeur remplacé");
    toast()!.querySelector<HTMLButtonElement>(".dk-toast__action")!.click();
    expect(app.loadDoc).toHaveBeenLastCalledWith(prev, "old.dktable");
    expect(app.dirty).toBe(true);
  });

  it("refused confirmation (injected) keeps the workbook and shows no toast", async () => {
    vi.mocked(io.openDocument).mockResolvedValue({ doc, path: "a.dktable" } as never);
    setConfirm(() => false);
    const app = fakeApp(true);
    await openFile(app);
    expect(app.loadDoc).not.toHaveBeenCalled();
    expect(toast()).toBeNull();
  });

  it("newDocument shows the same undo toast", () => {
    newDocument(fakeApp(false));
    expect(toast()!.textContent).toContain("Classeur remplacé");
  });
});
