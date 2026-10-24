// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createGrid, type Grid } from "./grid";

let host: HTMLElement;
let raw: Record<string, string>;
let onEdit: (k: string, v: string) => void;
let grid: Grid;

const root = () => host.querySelector(".dkg") as HTMLElement;
const cell = (k: string) => host.querySelector(`[data-key="${k}"]`) as HTMLElement | null;
const key = (el: Element, k: string, init: KeyboardEventInit = {}) =>
  el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true, ...init }));
const input = () => host.querySelector("input.dkg-editor") as HTMLInputElement | null;
const scrollTo = (y: number) => {
  root().scrollTop = y;
  root().dispatchEvent(new Event("scroll"));
};

beforeEach(() => {
  host = document.createElement("div");
  document.body.replaceChildren(host);
  raw = { A1000: "end" };
  onEdit = vi.fn((k: string, v: string) => { raw[k] = v; });
  grid = createGrid(host, {
    cols: 26, rows: 1000, getDisplay: (k) => raw[k] ?? "", getRaw: (k) => raw[k] ?? "", onEdit,
  });
  Object.defineProperty(root(), "clientHeight", { value: 280, configurable: true });
  scrollTo(0);
});

describe("row virtualization", () => {
  it("keeps only visible rows + overscan in the DOM", () => {
    const rows = host.querySelectorAll(".dkg-rowh").length;
    expect(rows).toBeGreaterThan(0);
    expect(rows).toBeLessThanOrEqual(280 / 28 + 2 * 10);
    expect(host.querySelectorAll(".dkg-cell").length).toBe(rows * 26);
    expect(cell("A1000")).toBeNull();
  });
  it("scrolling renders the right rows", () => {
    scrollTo(28 * 500);
    expect(cell("A500")).not.toBeNull();
    expect(cell("A1")).toBeNull();
    expect(host.querySelectorAll(".dkg-rowh").length).toBeLessThanOrEqual(30);
  });
  it("keyboard to A1000 scrolls and renders the cell", () => {
    grid.select("A1");
    key(root(), "ArrowDown", { ctrlKey: true });
    expect(grid.getSelection()).toBe("A1000");
    expect(cell("A1000")).not.toBeNull();
    expect(cell("A1000")!.textContent).toBe("end");
    expect(cell("A1000")!.classList.contains("dkg-active")).toBe(true);
  });
  it("select() on a far cell renders it", () => {
    grid.select("C700");
    expect(cell("C700")!.classList.contains("dkg-active")).toBe(true);
  });
  it("edits a cell outside the initial window", () => {
    grid.select("B800");
    key(root(), "x");
    input()!.value = "hi";
    key(input()!, "Enter");
    expect(onEdit).toHaveBeenCalledWith("B800", "hi");
    expect(cell("B800")!.textContent).toBe("hi");
  });
  it("refresh of an unrendered cell is a no-op, and cells repaint on scroll back", () => {
    grid.refresh(["A900"]);
    raw.A900 = "z";
    scrollTo(28 * 890);
    expect(cell("A900")!.textContent).toBe("z");
    scrollTo(0);
    scrollTo(28 * 890);
    expect(cell("A900")!.textContent).toBe("z");
  });
  it("onCellCreated hook fires for newly rendered cells", () => {
    const h = document.createElement("div");
    document.body.appendChild(h);
    const seen: string[] = [];
    createGrid(h, { cols: 2, rows: 5, getDisplay: () => "", getRaw: () => "", onEdit, onCellCreated: (k) => seen.push(k) });
    expect(seen).toContain("B5");
  });
});
