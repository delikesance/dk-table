// @vitest-environment jsdom
/** Tests for the autosave wiring: trigger on dirty edits, eligibility, indicator, flush on close. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../io/files", () => ({
  openDocument: vi.fn(), openPath: vi.fn(), saveAs: vi.fn(), saveDocument: vi.fn(),
  importCsvFile: vi.fn(), exportCsvFile: vi.fn(),
}));
import * as io from "../io/files";
import { setupAutosave } from "./autosaveUi";
import { setTitle, type Ctx } from "./appState";

const doc = { version: 1 as const, sheets: [] };

/** Minimal Ctx whose App mirrors the real markSaved/setTitle relationship. */
function mkCtx(path: string | undefined): Ctx {
  const c = { app: { path, dirty: false, toDoc: () => doc, addRecent: vi.fn(), markSaved: () => setTitle(c, false) } } as unknown as Ctx;
  return c;
}

describe("autosave wiring", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.clearAllMocks(); vi.mocked(io.saveDocument).mockResolvedValue("a.dktable"); });
  afterEach(() => { vi.useRealTimers(); });

  it("saves to the existing path 1s after an edit, then clears dirty and shows Enregistré", async () => {
    const c = mkCtx("a.dktable"); setupAutosave(c);
    setTitle(c, true);
    expect(io.saveDocument).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1000);
    expect(io.saveDocument).toHaveBeenCalledWith(expect.objectContaining({ version: 1, sheets: [] }), "a.dktable");
    expect(c.app.dirty).toBe(false);
    expect(document.title).toContain("Enregistré");
  });

  it("does nothing for a document without path", async () => {
    const c = mkCtx(undefined); setupAutosave(c);
    setTitle(c, true);
    await vi.advanceTimersByTimeAsync(2000);
    expect(io.saveDocument).not.toHaveBeenCalled();
    expect(c.app.dirty).toBe(true);
  });

  it("shows Enregistrement… while writing", async () => {
    let done!: () => void;
    vi.mocked(io.saveDocument).mockReturnValue(new Promise((r) => { done = () => r("a.dktable"); }));
    const c = mkCtx("a.dktable"); setupAutosave(c);
    setTitle(c, true);
    await vi.advanceTimersByTimeAsync(1000);
    expect(document.title).toContain("Enregistrement…");
    done(); await vi.advanceTimersByTimeAsync(0);
  });

  it("shows an error state and stays dirty when the write fails", async () => {
    vi.mocked(io.saveDocument).mockRejectedValue(new Error("x"));
    const c = mkCtx("a.dktable"); setupAutosave(c);
    setTitle(c, true);
    await vi.advanceTimersByTimeAsync(1000);
    expect(document.title).toContain("Erreur");
    expect(c.app.dirty).toBe(true);
  });

  it("an edit made during the write keeps the document dirty and is saved next", async () => {
    let done!: () => void;
    vi.mocked(io.saveDocument).mockReturnValueOnce(new Promise((r) => { done = () => r("a.dktable"); }));
    const c = mkCtx("a.dktable"); setupAutosave(c);
    setTitle(c, true);
    await vi.advanceTimersByTimeAsync(1000);
    setTitle(c, true);
    done(); await vi.advanceTimersByTimeAsync(0);
    expect(io.saveDocument).toHaveBeenCalledTimes(2);
    expect(c.app.dirty).toBe(false);
  });

  it("flushes immediately on beforeunload", async () => {
    const c = mkCtx("a.dktable"); setupAutosave(c);
    setTitle(c, true);
    window.dispatchEvent(new Event("beforeunload"));
    await vi.advanceTimersByTimeAsync(0);
    expect(io.saveDocument).toHaveBeenCalledTimes(1);
  });
});
