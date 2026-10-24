// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { createSidebar } from "./sidebar";

const fns = [
  { name: "SUM", signature: "SUM(range)", description: "Adds numbers" },
  { name: "AVERAGE", signature: "AVERAGE(range)", description: "Mean" },
  { name: "SPARKLINE", signature: "SPARKLINE(range)", description: "Mini curve" },
];
/** Build a sidebar with spies. */
function setup() {
  const host = document.createElement("div");
  const o = { functions: fns, onInsert: vi.fn(), onOpenRecent: vi.fn() };
  const s = createSidebar(host, o);
  return { host, o, s };
}
const items = (h: HTMLElement) => [...h.querySelectorAll<HTMLElement>(".dk-fn-list .dk-item")];

describe("createSidebar", () => {
  it("lists all functions, filters by search", () => {
    const { host } = setup();
    expect(items(host).length).toBe(3);
    const q = host.querySelector<HTMLInputElement>("input[type=search]")!;
    q.value = "spark";
    q.dispatchEvent(new Event("input", { bubbles: true }));
    expect(items(host).map((i) => i.dataset.name)).toEqual(["SPARKLINE"]);
  });
  it("inserts function on click and Enter", () => {
    const { host, o } = setup();
    items(host)[0].click();
    expect(o.onInsert).toHaveBeenCalledWith("SUM");
    items(host)[1].dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(o.onInsert).toHaveBeenCalledWith("AVERAGE");
  });
  it("sets recent files and opens one", () => {
    const { host, o, s } = setup();
    s.setRecent([{ path: "/a/b.csv", name: "b.csv" }]);
    const r = host.querySelector<HTMLElement>(".dk-recent .dk-item")!;
    expect(r.textContent).toContain("b.csv");
    r.click();
    expect(o.onOpenRecent).toHaveBeenCalledWith("/a/b.csv");
  });
  it("shows cell info", () => {
    const { host, s } = setup();
    s.setCellInfo({ ref: "B2", raw: "=A1+1", display: "5", format: "number" });
    const t = host.querySelector(".dk-cellinfo")!.textContent!;
    expect(t).toContain("B2");
    expect(t).toContain("=A1+1");
    expect(t).toContain("number");
  });
  it("sections collapse via header and aria-expanded", () => {
    const { host } = setup();
    const h = host.querySelector<HTMLElement>(".dk-section__head")!;
    h.click();
    expect(h.closest(".dk-section")!.classList.contains("dk-section--closed")).toBe(true);
    expect(h.getAttribute("aria-expanded")).toBe("false");
  });
  it("toggles whole panel", () => {
    const { host, s } = setup();
    s.toggle();
    expect(host.querySelector<HTMLElement>(".dk-sidebar")!.hidden).toBe(true);
    s.toggle();
    expect(host.querySelector<HTMLElement>(".dk-sidebar")!.hidden).toBe(false);
  });
});
