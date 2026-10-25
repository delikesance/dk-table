// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { openImportReport } from "./importReport";

const CSV = "id,n\n007,1\n0123,2\n";
const app = () => ({ importSheet: vi.fn() });

describe("openImportReport", () => {
  it("imports directly when nothing is risky", () => {
    const a = app();
    openImportReport(a as never, "x", "a,b\n1,2\n");
    expect(a.importSheet).toHaveBeenCalledOnce();
    expect(document.querySelector(".dk-dialog")).toBeNull();
  });
  it("lists avoided conversions and imports as text by default", () => {
    const a = app();
    openImportReport(a as never, "x", CSV);
    expect(document.querySelector(".dk-import")!.textContent).toContain("zéros de tête");
    document.querySelector<HTMLElement>('[data-action="import"]')!.click();
    expect(a.importSheet.mock.calls[0][1].cells.A2.raw).toBe("'007");
    document.querySelector<HTMLElement>('[data-action="close"]')?.click();
  });
  it("accepting a column converts it", () => {
    const a = app();
    openImportReport(a as never, "x", CSV);
    document.querySelector<HTMLInputElement>('input[data-col="A"]')!.checked = true;
    document.querySelector<HTMLElement>('[data-action="import"]')!.click();
    expect(a.importSheet.mock.calls[0][1].cells.A2.raw).toBe("007");
  });
});
