// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { createGrid, type Grid } from "./grid";

let host: HTMLElement;
let raw: Record<string, string>;
let onEdit: Mock<(key: string, raw: string) => void>;
let onSheetStep: Mock<(dir: -1 | 1) => void>;
let grid: Grid;

const root = () => host.querySelector(".dkg") as HTMLElement;
const ed = () => host.querySelector(".dkg-editor") as HTMLTextAreaElement | null;
const cell = (k: string) => host.querySelector(`[data-key="${k}"]`) as HTMLElement;
const key = (el: Element, k: string, init: KeyboardEventInit = {}) =>
  el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true, ...init }));

beforeEach(() => {
  host = document.createElement("div");
  document.body.replaceChildren(host);
  raw = { A3: "1", A4: "2", A5: "3", D2: "x" };
  onEdit = vi.fn((k: string, v: string) => { raw[k] = v; });
  onSheetStep = vi.fn();
  grid = createGrid(host, {
    cols: 26, rows: 100, getDisplay: (k) => raw[k] ?? "", getRaw: (k) => raw[k] ?? "", onEdit, onSheetStep,
  });
});

describe("navigation keys", () => {
  it("Ctrl+Down jumps to the edges of data blocks", () => {
    key(root(), "ArrowDown", { ctrlKey: true });
    expect(grid.getSelection()).toBe("A3");
    key(root(), "ArrowDown", { ctrlKey: true });
    expect(grid.getSelection()).toBe("A5");
    key(root(), "ArrowDown", { ctrlKey: true });
    expect(grid.getSelection()).toBe("A100");
  });
  it("Home, Ctrl+Home, Ctrl+End, with Shift extending", () => {
    grid.select("C7");
    key(root(), "Home");
    expect(grid.getSelection()).toBe("A7");
    key(root(), "End", { ctrlKey: true });
    expect(grid.getSelection()).toBe("D5");
    key(root(), "Home", { ctrlKey: true, shiftKey: true });
    expect(grid.getSelection()).toBe("A1:D5");
  });
  it("PageDown / PageUp move by a visible page", () => {
    key(root(), "PageDown");
    const r = Number(grid.getSelection().slice(1));
    expect(r).toBeGreaterThan(5);
    key(root(), "PageUp", { shiftKey: true });
    expect(grid.getSelection()).toBe(`A1:A${r}`);
  });
  it("Ctrl+A selects the used range", () => {
    grid.select("B2");
    key(root(), "a", { ctrlKey: true });
    expect(grid.getSelection()).toBe("A1:D5");
    expect(ed()).toBeNull();
  });
  it("Ctrl+Space selects columns, Shift+Space rows, without editing", () => {
    grid.select("B2:C3");
    key(root(), " ", { ctrlKey: true });
    expect(grid.getSelection()).toBe("B1:C100");
    grid.select("B2:C3");
    key(root(), " ", { shiftKey: true });
    expect(grid.getSelection()).toBe("A2:Z3");
    expect(ed()).toBeNull();
  });
  it("Ctrl+PageDown / Ctrl+PageUp ask for the next / previous sheet", () => {
    key(root(), "PageDown", { ctrlKey: true });
    key(root(), "PageUp", { ctrlKey: true });
    expect(onSheetStep.mock.calls).toEqual([[1], [-1]]);
    expect(grid.getSelection()).toBe("A1");
  });
});

describe("editor keys", () => {
  it("Ctrl+Enter commits the value into every selected cell", () => {
    grid.select("B1:C2");
    key(root(), "7");
    key(ed()!, "Enter", { ctrlKey: true });
    expect(onEdit.mock.calls.map((c) => c[0]).sort()).toEqual(["B1", "B2", "C1", "C2"]);
    expect(raw.C2).toBe("7");
    expect(ed()).toBeNull();
    expect(grid.getSelection()).toBe("B1:C2");
  });
  it("Alt+Enter inserts a line break; the cell wraps it", () => {
    key(root(), "a");
    const t = ed()!;
    t.setSelectionRange(1, 1);
    key(t, "Enter", { altKey: true });
    expect(ed()).not.toBeNull();
    t.value += "b";
    key(t, "Enter");
    expect(raw.A1).toBe("a\nb");
    expect(cell("A1").classList.contains("dkg-ml")).toBe(true);
    expect(cell("A3").classList.contains("dkg-ml")).toBe(false);
  });
  it("F4 cycles the reference at the caret in the editor", () => {
    key(root(), "=");
    const t = ed()!;
    t.value = "=A1";
    t.setSelectionRange(3, 3);
    key(t, "F4");
    expect(t.value).toBe("=$A$1");
  });
  it("navigation keys do nothing while the editor is open", () => {
    key(root(), "x");
    key(ed()!, "a", { ctrlKey: true });
    key(ed()!, "PageDown", { ctrlKey: true });
    expect(grid.getSelection()).toBe("A1");
    expect(onSheetStep).not.toHaveBeenCalled();
  });
});
