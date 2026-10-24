// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { showOnboarding } from "./onboarding";

let host: HTMLElement;
let sheets: { id: string; name: string }[];
const api = () => ({
  sheets: () => sheets,
  addSheet: vi.fn(() => { sheets.push({ id: "n", name: "Feuille 2" }); }),
  switchSheet: vi.fn(),
});

beforeEach(() => {
  document.body.innerHTML = '<div id="h"></div>';
  host = document.getElementById("h")!;
  sheets = [{ id: "a", name: "Budget" }, { id: "b", name: "Notes" }];
});

describe("onboarding", () => {
  it("renders an ARIA list of the sheets and a create button", () => {
    showOnboarding(host, api());
    const items = host.querySelectorAll('[role="list"] [role="listitem"] button');
    expect([...items].map((i) => i.textContent)).toEqual(["Budget", "Notes"]);
    expect(host.querySelector('[data-action="create"]')).not.toBeNull();
    expect(host.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it("create adds a sheet, enters the grid and closes the screen", () => {
    const a = api();
    showOnboarding(host, a);
    host.querySelector<HTMLElement>('[data-action="create"]')!.click();
    expect(a.addSheet).toHaveBeenCalledOnce();
    expect(host.querySelector(".ob")).toBeNull();
  });

  it("clicking an item selects that sheet and closes", () => {
    const a = api();
    showOnboarding(host, a);
    host.querySelectorAll<HTMLElement>("[data-sheet]")[1].click();
    expect(a.switchSheet).toHaveBeenCalledWith("b");
    expect(host.querySelector(".ob")).toBeNull();
  });

  it("shows an empty state when there is no project", () => {
    sheets = [];
    showOnboarding(host, api());
    expect(host.querySelector('[role="list"]')).toBeNull();
    expect(host.querySelector(".ob__empty")).not.toBeNull();
  });

  it("is keyboard accessible: focus on create, Escape closes", () => {
    showOnboarding(host, api());
    expect(document.activeElement).toBe(host.querySelector('[data-action="create"]'));
    host.querySelector<HTMLElement>(".ob")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(host.querySelector(".ob")).toBeNull();
  });
});
