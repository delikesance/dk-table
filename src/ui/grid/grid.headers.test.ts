// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { createGrid, type Grid } from "./grid";
import { headerSel } from "./mouse";

let host: HTMLElement;
let raw: Record<string, string>;
let onEdit: Mock<(key: string, raw: string) => void>;
let grid: Grid;

const root = () => host.querySelector(".dkg") as HTMLElement;
const cell = (k: string) => host.querySelector(`[data-key="${k}"]`) as HTMLElement;
const colh = (c: number) => host.querySelectorAll<HTMLElement>(".dkg-colh")[c];
const rowh = (r: number) => host.querySelector<HTMLElement>(`.dkg-rowh[data-row="${r}"]`)!;
const fire = (el: Element, type: string, init: MouseEventInit = {}) =>
  el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, ...init }));
const up = () => document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));

beforeEach(() => {
  host = document.createElement("div");
  document.body.replaceChildren(host);
  raw = { A1: "1", A3: "x", C2: "y" };
  onEdit = vi.fn((k: string, v: string) => { raw[k] = v; });
  grid = createGrid(host, {
    cols: 26, rows: 100, getDisplay: (k) => raw[k] ?? "", getRaw: (k) => raw[k] ?? "", onEdit,
  });
});

describe("headerSel", () => {
  it("spans whole columns or rows between two headers, cursor on the first row/column", () => {
    expect(headerSel("col", 1, 3, 26, 100)).toEqual({ anchor: { col: 1, row: 99 }, active: { col: 3, row: 0 } });
    expect(headerSel("row", 4, 2, 26, 100)).toEqual({ anchor: { col: 25, row: 4 }, active: { col: 0, row: 2 } });
  });
});

describe("header selection", () => {
  it("clicking a column header selects the whole column and highlights it", () => {
    fire(colh(1), "mousedown"); up();
    expect(grid.getSelection()).toBe("B1:B100");
    expect(cell("B1").classList.contains("dkg-active")).toBe(true);
    expect(cell("B5").classList.contains("dkg-range")).toBe(true);
    expect(colh(1).classList.contains("dkg-on")).toBe(true);
  });
  it("clicking a row header selects the whole row", () => {
    fire(rowh(2), "mousedown"); up();
    expect(grid.getSelection()).toBe("A3:Z3");
    expect(cell("Z3").classList.contains("dkg-range")).toBe(true);
    expect(rowh(2).classList.contains("dkg-on")).toBe(true);
  });
  it("shift-click extends to whole columns / rows from the anchor", () => {
    fire(colh(1), "mousedown"); up();
    fire(colh(3), "mousedown", { shiftKey: true }); up();
    expect(grid.getSelection()).toBe("B1:D100");
    expect(colh(2).classList.contains("dkg-on")).toBe(true);
    fire(rowh(1), "mousedown"); up();
    fire(rowh(4), "mousedown", { shiftKey: true }); up();
    expect(grid.getSelection()).toBe("A2:Z5");
  });
  it("dragging across headers (or cells) extends whole columns / rows", () => {
    fire(colh(0), "mousedown");
    fire(colh(2), "mouseover");
    expect(grid.getSelection()).toBe("A1:C100");
    fire(cell("D7"), "mouseover");
    expect(grid.getSelection()).toBe("A1:D100");
    up();
    fire(colh(5), "mouseover");
    expect(grid.getSelection()).toBe("A1:D100");
    fire(rowh(3), "mousedown");
    fire(rowh(1), "mouseover"); up();
    expect(grid.getSelection()).toBe("A2:Z4");
  });
  it("a right-click on a header leaves the selection to the context menu", () => {
    fire(colh(1), "mousedown"); up();
    fire(colh(3), "mousedown", { shiftKey: true }); up();
    fire(colh(2), "mousedown", { button: 2 }); up();
    expect(grid.getSelection()).toBe("B1:D100");
  });
  it("the corner selects the whole sheet", () => {
    fire(host.querySelector(".dkg-corner")!, "mousedown"); up();
    expect(grid.getSelection()).toBe("A1:Z100");
  });
  it("ignores the column resizer", () => {
    grid.select("C3");
    fire(colh(1).querySelector(".dkg-resizer")!, "mousedown"); up();
    expect(grid.getSelection()).toBe("C3");
  });
  it("Delete clears only the filled cells of a selected column", () => {
    fire(colh(0), "mousedown"); up();
    root().dispatchEvent(new KeyboardEvent("keydown", { key: "Delete", bubbles: true, cancelable: true }));
    expect(onEdit.mock.calls).toEqual([["A1", ""], ["A3", ""]]);
  });
  it("copies the selected row as TSV", () => {
    fire(rowh(1), "mousedown"); up();
    const e = new Event("copy", { bubbles: true, cancelable: true }) as Event & { clipboardData: unknown };
    let out = "";
    e.clipboardData = { getData: () => "", setData: (_t: string, v: string) => (out = v) };
    root().dispatchEvent(e);
    expect(out.split("\t")[2]).toBe("y");
    expect(out.split("\t").length).toBe(26);
  });
  it("typing after a column click edits the first cell of the column", () => {
    fire(colh(2), "mousedown"); up();
    root().dispatchEvent(new KeyboardEvent("keydown", { key: "z", bubbles: true, cancelable: true }));
    expect(cell("C1").querySelector(".dkg-editor")).not.toBeNull();
  });
});
