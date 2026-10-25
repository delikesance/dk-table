// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { openHistory } from "./history";
import { loadHistory, stampSave, currentHistory } from "../history/store";
import type { DktDoc } from "../../io/types";

const d = (cells: Record<string, string>): DktDoc => ({
  version: 1, active: "s1",
  sheets: [{ id: "s1", name: "A", cols: 26, rows: 100, cells: Object.fromEntries(Object.entries(cells).map(([k, raw]) => [k, { raw }])) }],
});

describe("openHistory", () => {
  let now = d({ A1: "3" });
  const app = () => ({ toDoc: () => now, selection: () => "A1", loadDoc: vi.fn(), path: undefined });
  beforeEach(() => {
    document.body.innerHTML = "";
    loadHistory(d({ A1: "1" }));
    stampSave(d({ A1: "2" }), 1000);
    stampSave(now, 2000);
  });
  it("shows the history of the active cell and the time slider", () => {
    openHistory(app() as never);
    const t = document.querySelector(".dk-hist__cell")!.textContent!;
    expect(t).toContain("1");
    expect(t).toContain("3");
    expect(document.querySelector<HTMLInputElement>('input[type="range"]')!.max).toBe("2");
  });
  it("slider shows the differences with the state at that time", () => {
    openHistory(app() as never);
    const r = document.querySelector<HTMLInputElement>('input[type="range"]')!;
    r.value = "0"; r.dispatchEvent(new Event("input"));
    expect(document.querySelector(".dk-hist__diff")!.textContent).toContain("A1");
  });
  it("creates and compares a named snapshot", () => {
    openHistory(app() as never);
    document.querySelector<HTMLInputElement>('input[name="snap"]')!.value = "Clôture";
    document.querySelector<HTMLElement>('[data-action="snap"]')!.click();
    expect(currentHistory().snaps[0].name).toBe("Clôture");
    expect(document.querySelector(".dk-hist__snaps")!.textContent).toContain("Clôture");
  });
});
