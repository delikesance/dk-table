// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { createGrid, type Grid } from "./grid";

let host: HTMLElement;
let raw: Record<string, string>;
let onEdit: Mock<(key: string, raw: string) => void>;
let onSelect: Mock<(sel: string) => void>;
let grid: Grid;

const cell = (k: string) => host.querySelector(`[data-key="${k}"]`) as HTMLElement;
const key = (el: Element, k: string, init: KeyboardEventInit = {}) =>
  el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true, ...init }));
const root = () => host.querySelector(".dkg") as HTMLElement;
const input = () => host.querySelector("input.dkg-editor") as HTMLInputElement | null;
const down = (k: string, init: MouseEventInit = {}) =>
  cell(k).dispatchEvent(new MouseEvent("mousedown", { bubbles: true, ...init }));
const clip = (type: string, data: string) => {
  const e = new Event(type, { bubbles: true, cancelable: true }) as Event & { clipboardData: unknown };
  const store: Record<string, string> = { "text/plain": data };
  e.clipboardData = { getData: (t: string) => store[t] ?? "", setData: (t: string, v: string) => (store[t] = v) };
  root().dispatchEvent(e);
  return store["text/plain"];
};

beforeEach(() => {
  host = document.createElement("div");
  document.body.replaceChildren(host);
  raw = { A1: "1", B1: "=A1*2" };
  onEdit = vi.fn((k: string, v: string) => { raw[k] = v; });
  onSelect = vi.fn();
  grid = createGrid(host, {
    cols: 26, rows: 100,
    getDisplay: (k) => (k === "B1" ? "2" : raw[k] ?? ""),
    getRaw: (k) => raw[k] ?? "",
    onEdit, onSelect,
  });
});

describe("createGrid", () => {
  it("renders headers and a window of rows showing display values", () => {
    const rows = host.querySelectorAll(".dkg-rowh").length;
    expect(rows).toBeGreaterThan(0);
    expect(rows).toBeLessThanOrEqual(100);
    expect(host.querySelectorAll(".dkg-cell").length).toBe(rows * 26);
    expect(host.querySelectorAll(".dkg-colh").length).toBe(26);
    expect(cell("B1").textContent).toBe("2");
    expect(host.querySelector(".dkg-colh")!.textContent).toBe("A");
  });
  it("click selects, highlights, notifies", () => {
    down("C3");
    expect(grid.getSelection()).toBe("C3");
    expect(cell("C3").classList.contains("dkg-active")).toBe(true);
    expect(onSelect).toHaveBeenLastCalledWith("C3");
  });
  it("shift-click selects a range", () => {
    grid.select("A1");
    down("B2", { shiftKey: true });
    expect(grid.getSelection()).toBe("A1:B2");
    expect(cell("A2").classList.contains("dkg-range")).toBe(true);
  });
  it("arrows, Tab, Enter move; clamped at edges", () => {
    grid.select("A1");
    key(root(), "ArrowLeft"); expect(grid.getSelection()).toBe("A1");
    key(root(), "ArrowRight"); expect(grid.getSelection()).toBe("B1");
    key(root(), "ArrowDown"); expect(grid.getSelection()).toBe("B2");
    key(root(), "Tab"); expect(grid.getSelection()).toBe("C2");
    key(root(), "Tab", { shiftKey: true }); expect(grid.getSelection()).toBe("B2");
    key(root(), "Enter"); expect(grid.getSelection()).toBe("B3");
  });
  it("shift+arrow extends range", () => {
    grid.select("A1");
    key(root(), "ArrowRight", { shiftKey: true });
    key(root(), "ArrowDown", { shiftKey: true });
    expect(grid.getSelection()).toBe("A1:B2");
  });
  it("typing starts edit replacing content; Enter commits and moves down", () => {
    grid.select("A1");
    key(root(), "x");
    expect(input()!.value).toBe("x");
    input()!.value = "xy";
    key(input()!, "Enter");
    expect(onEdit).toHaveBeenCalledWith("A1", "xy");
    expect(input()).toBeNull();
    expect(grid.getSelection()).toBe("A2");
    expect(cell("A1").textContent).toBe("xy");
  });
  it("F2 and dblclick edit with raw value; Esc cancels", () => {
    grid.select("B1");
    key(root(), "F2");
    expect(input()!.value).toBe("=A1*2");
    input()!.value = "zzz";
    key(input()!, "Escape");
    expect(onEdit).not.toHaveBeenCalled();
    expect(input()).toBeNull();
    down("A1");
    cell("A1").dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    expect(input()!.value).toBe("1");
  });
  it("Tab while editing commits and moves right", () => {
    grid.select("A1");
    key(root(), "F2");
    input()!.value = "5";
    key(input()!, "Tab");
    expect(onEdit).toHaveBeenCalledWith("A1", "5");
    expect(grid.getSelection()).toBe("B1");
  });
  it("clicking another cell while editing commits", () => {
    grid.select("A1");
    key(root(), "F2");
    input()!.value = "7";
    down("C3");
    expect(onEdit).toHaveBeenCalledWith("A1", "7");
    expect(grid.getSelection()).toBe("C3");
  });
  it("Delete clears every selected cell", () => {
    grid.select("A1");
    key(root(), "ArrowRight", { shiftKey: true });
    key(root(), "Delete");
    expect(onEdit).toHaveBeenCalledWith("A1", "");
    expect(onEdit).toHaveBeenCalledWith("B1", "");
  });
  it("copy produces TSV of raw values; paste applies from active cell", () => {
    grid.select("A1");
    key(root(), "ArrowRight", { shiftKey: true });
    expect(clip("copy", "")).toBe("1\t=A1*2");
    grid.select("C5");
    clip("paste", "a\tb\nc\td");
    expect(onEdit).toHaveBeenCalledWith("C5", "a");
    expect(onEdit).toHaveBeenCalledWith("D5", "b");
    expect(onEdit).toHaveBeenCalledWith("C6", "c");
    expect(onEdit).toHaveBeenCalledWith("D6", "d");
  });
  it("refresh updates display; renderCell hook overrides content", () => {
    raw.A1 = "9";
    grid.refresh(["A1"]);
    expect(cell("A1").textContent).toBe("9");
    const h2 = document.createElement("div");
    const g2 = createGrid(h2, {
      cols: 3, rows: 3, getDisplay: () => "t", getRaw: () => "", onEdit, onSelect,
      renderCell: (k) => {
        if (k !== "A1") return null;
        const s = document.createElement("span");
        s.className = "spark";
        return s;
      },
    });
    expect(h2.querySelector('[data-key="A1"] .spark')).not.toBeNull();
    expect(h2.querySelector('[data-key="B1"]')!.textContent).toBe("t");
    g2.refresh();
  });
});

describe("incremental refresh", () => {
  it("re-renders only changed cells (edited + dependent)", () => {
    const g = createGrid(host, {
      cols: 26, rows: 100,
      getDisplay: (k) => (k === "B1" ? String(Number(raw.A1) * 2) : raw[k] ?? ""),
      getRaw: (k) => raw[k] ?? "",
      onEdit: (k, v) => { raw[k] = v; },
    });
    const hosts = host.querySelectorAll(".dkg");
    const mo = new MutationObserver(() => {});
    mo.observe(hosts[hosts.length - 1], { subtree: true, childList: true, characterData: true });
    const touched = () => new Set(mo.takeRecords().map((r) => (r.target as Node).parentElement?.closest(".dkg-cell") ?? r.target)
      .map((n) => (n as HTMLElement).dataset?.key));
    mo.takeRecords();
    g.refresh();
    expect(touched().size).toBe(0);
    raw.A1 = "5";
    g.refresh();
    expect([...touched()].sort()).toEqual(["A1", "B1"]);
    expect(host.querySelectorAll(".dkg")[hosts.length - 1].querySelector('[data-key="B1"]')!.textContent).toBe("10");
  });
});
