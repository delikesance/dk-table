// @vitest-environment jsdom
/** Right-click on cells: keeps a multi-cell selection it falls in, otherwise selects the cell (never starts a drag). */
import { describe, it, expect, beforeEach } from "vitest";
import { createGrid, type Grid } from "./grid";
import { inSelection } from "./mouse";

let host: HTMLElement;
let grid: Grid;
const cell = (k: string) => host.querySelector(`[data-key="${k}"]`) as HTMLElement;
const fire = (el: Element, type: string, init: MouseEventInit = {}) =>
  el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, ...init }));
const right = (k: string) => { fire(cell(k), "mousedown", { button: 2 }); document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true })); };

beforeEach(() => {
  host = document.createElement("div");
  document.body.replaceChildren(host);
  grid = createGrid(host, { cols: 26, rows: 100, getDisplay: () => "", getRaw: () => "", onEdit: () => {} });
});

describe("inSelection", () => {
  it("tests a position against a rectangle given by two corners, either order", () => {
    expect(inSelection({ anchor: { col: 3, row: 4 }, active: { col: 1, row: 2 } }, { col: 2, row: 3 })).toBe(true);
    expect(inSelection({ anchor: { col: 3, row: 4 }, active: { col: 1, row: 2 } }, { col: 4, row: 3 })).toBe(false);
  });
});

describe("right-click", () => {
  it("inside a range keeps the whole range", () => {
    grid.select("B2:D5");
    right("C3");
    expect(grid.getSelection()).toBe("B2:D5");
  });
  it("on the active cell of a range keeps the range too", () => {
    grid.select("B2:D5");
    right("B2");
    expect(grid.getSelection()).toBe("B2:D5");
  });
  it("outside the range selects that cell only", () => {
    grid.select("B2:D5");
    right("F9");
    expect(grid.getSelection()).toBe("F9");
  });
  it("does not start a drag: moving over cells afterwards changes nothing", () => {
    grid.select("B2");
    right("C3");
    fire(cell("E5"), "mouseover");
    expect(grid.getSelection()).toBe("C3");
  });
  it("a whole-column selection survives a right-click on one of its cells", () => {
    grid.select("B1:C100");
    right("C10");
    expect(grid.getSelection()).toBe("B1:C100");
  });
});
