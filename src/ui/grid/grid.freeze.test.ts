// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { createGrid, type Grid } from "./grid";
import type { GridView } from "./types";

let host: HTMLElement;
let grid: Grid;
let view: GridView;

const root = () => host.querySelector(".dkg") as HTMLElement;
const cell = (k: string) => host.querySelector(`[data-key="${k}"]`) as HTMLElement | null;
const key = (el: Element, k: string, init: KeyboardEventInit = {}) =>
  el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true, ...init }));
const scrollTo = (y: number) => {
  root().scrollTop = y;
  root().dispatchEvent(new Event("scroll"));
};
const make = (freeze?: { rows: number; cols: number }) => {
  host.replaceChildren();
  view = { widths: {}, filters: {}, freeze };
  grid = createGrid(host, { cols: 26, rows: 1000, view, getDisplay: () => "", getRaw: () => "", onEdit: () => {} });
  Object.defineProperty(root(), "clientHeight", { value: 280, configurable: true });
  scrollTo(0);
};

beforeEach(() => {
  host = document.createElement("div");
  document.body.replaceChildren(host);
  make({ rows: 2, cols: 1 });
});

describe("frozen panes in the grid", () => {
  it("frozen rows stay rendered when scrolled far past them", () => {
    scrollTo(28 * 500);
    expect(cell("A1")).not.toBeNull();
    expect(cell("C2")).not.toBeNull();
    expect(cell("A3")).toBeNull();
    expect(cell("A500")).not.toBeNull();
  });
  it("marks frozen cells sticky with offsets from root variables", () => {
    expect(cell("C1")!.classList.contains("dkg-frozen")).toBe(true);
    expect(cell("C1")!.style.top).toBe("var(--dkg-t0)");
    expect(cell("A5")!.classList.contains("dkg-frozen")).toBe(true);
    expect(cell("A5")!.style.left).toBe("var(--dkg-l0)");
    expect(cell("B5")!.classList.contains("dkg-frozen")).toBe(false);
    expect(root().style.getPropertyValue("--dkg-t1")).toBe("calc(var(--col-header-h) + 28px)");
  });
  it("marks the separator after the last frozen row and column", () => {
    expect(cell("C2")!.classList.contains("dkg-frozen-b")).toBe(true);
    expect(cell("C1")!.classList.contains("dkg-frozen-b")).toBe(false);
    expect(cell("A9")!.classList.contains("dkg-frozen-r")).toBe(true);
    const rowHead = [...host.querySelectorAll<HTMLElement>(".dkg-rowh")].find((h) => h.textContent === "2")!;
    expect(rowHead.classList.contains("dkg-frozen-b")).toBe(true);
    expect(rowHead.style.top).toBe("var(--dkg-t1)");
    const colHead = [...host.querySelectorAll<HTMLElement>(".dkg-colh")].find((h) => h.textContent?.startsWith("A"))!;
    expect(colHead.classList.contains("dkg-frozen-r")).toBe(true);
    expect(colHead.style.left).toBe("var(--dkg-l0)");
  });
  it("scrolls a cell hidden under the frozen rows back into view", () => {
    scrollTo(140);
    grid.select("B7");
    expect(root().scrollTop).toBe(112);
  });
  it("selecting a frozen cell does not scroll", () => {
    scrollTo(28 * 300);
    grid.select("B1");
    expect(root().scrollTop).toBe(28 * 300);
  });
  it("keyboard navigation crosses the frozen band", () => {
    grid.select("B2");
    key(root(), "ArrowDown");
    expect(grid.getSelection()).toBe("B3");
    key(root(), "ArrowDown", { ctrlKey: true });
    expect(grid.getSelection()).toBe("B1000");
    expect(cell("B1")).not.toBeNull();
    key(root(), "ArrowUp", { ctrlKey: true });
    expect(grid.getSelection()).toBe("B1");
  });
  it("no freeze: no frozen classes nor variables", () => {
    make();
    expect(host.querySelector(".dkg-frozen")).toBeNull();
    expect(root().style.getPropertyValue("--dkg-t0")).toBe("");
  });
});
