// @vitest-environment jsdom
/** Freeze drag handles (Google Sheets): bars on the freeze lines, dragged to a row/column boundary. */
import { describe, expect, it, vi } from "vitest";
import { createGrid } from "./grid";
import { snapCount } from "./freezeHandle";

const spans = [{ i: 1, start: 50, end: 70 }, { i: 0, start: 30, end: 50 }, { i: 2, start: 70, end: 90 }];

describe("snapCount", () => {
  it("snaps a pointer position to the nearest line boundary", () => {
    expect(snapCount(10, spans, 30)).toBe(0); // over the header: unfreeze
    expect(snapCount(35, spans, 30)).toBe(0);
    expect(snapCount(45, spans, 30)).toBe(1);
    expect(snapCount(62, spans, 30)).toBe(2);
    expect(snapCount(200, spans, 30)).toBe(3); // past the last rendered line
  });
});

/** Give rendered row headers / column headers a fake layout (jsdom has none). */
function layout(host: HTMLElement): void {
  const rect = (l: number, t: number, w: number, h: number) => () => ({ left: l, top: t, right: l + w, bottom: t + h, width: w, height: h, x: l, y: t, toJSON() {} }) as DOMRect;
  host.querySelectorAll<HTMLElement>(".dkg-rowh").forEach((e) => { e.getBoundingClientRect = rect(0, 28 + 24 * Number(e.dataset.row), 48, 24); });
  host.querySelectorAll<HTMLElement>(".dkg-colh").forEach((e) => { e.getBoundingClientRect = rect(48 + 96 * Number(e.dataset.col), 0, 96, 28); });
  host.querySelector<HTMLElement>(".dkg-corner")!.getBoundingClientRect = rect(0, 0, 48, 28);
}
const mouse = (el: EventTarget, type: string, x: number, y: number) =>
  el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y }));

describe("freeze handles", () => {
  const make = (onFreeze?: (f: { rows: number; cols: number }) => void, freeze = { rows: 0, cols: 0 }) => {
    const host = document.createElement("div");
    document.body.replaceChildren(host);
    createGrid(host, { cols: 26, rows: 100, getDisplay: () => "", getRaw: () => "", onEdit: () => {}, onFreeze, view: { widths: {}, filters: {}, freeze } });
    layout(host);
    return host;
  };
  it("absent without onFreeze", () => {
    expect(make().querySelector(".dkg-fz")).toBeNull();
  });
  it("dragging the row bar freezes rows up to the drop line, the column bar columns", () => {
    const onFreeze = vi.fn();
    const host = make(onFreeze, { rows: 0, cols: 1 });
    mouse(host.querySelector(".dkg-fz--rows")!, "mousedown", 10, 28);
    mouse(document, "mousemove", 10, 28 + 24 * 2 + 20);
    expect(host.querySelector(".dkg-fz-guide")).not.toBeNull();
    mouse(document, "mouseup", 10, 28 + 24 * 2 + 20);
    expect(onFreeze).toHaveBeenLastCalledWith({ rows: 3, cols: 1 });
    expect(host.querySelector(".dkg-fz-guide")).toBeNull();
    mouse(host.querySelector(".dkg-fz--cols")!, "mousedown", 144, 10);
    mouse(document, "mousemove", 20, 10);
    mouse(document, "mouseup", 20, 10);
    expect(onFreeze).toHaveBeenLastCalledWith({ rows: 0, cols: 0 });
  });
  it("a click without moving changes nothing and does not select the sheet", () => {
    const onFreeze = vi.fn();
    const host = make(onFreeze);
    mouse(host.querySelector(".dkg-fz--rows")!, "mousedown", 10, 28);
    mouse(document, "mouseup", 10, 28);
    expect(onFreeze).not.toHaveBeenCalled();
  });
});
