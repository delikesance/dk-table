// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { createGrid, type Grid } from "./grid";

let host: HTMLElement;
let onEdit: Mock<(key: string, raw: string) => void>;
let grid: Grid;

const root = () => host.querySelector(".dkg") as HTMLElement;
const input = () => host.querySelector(".dkg-editor") as HTMLTextAreaElement | null;
const key = (el: Element, k: string, init: KeyboardEventInit = {}) =>
  el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true, ...init }));

/** Mount a grid with a vi.fn onEdit. */
function mount(): void {
  host = document.createElement("div");
  document.body.replaceChildren(host);
  onEdit = vi.fn();
  grid = createGrid(host, { cols: 26, rows: 100, getDisplay: () => "", getRaw: () => "", onEdit });
}

beforeEach(mount);

describe("editor keys", () => {
  it("lets Ctrl+S from the editor reach document", () => {
    key(root(), "x");
    const seen = vi.fn();
    document.addEventListener("keydown", seen);
    key(input()!, "s", { ctrlKey: true });
    document.removeEventListener("keydown", seen);
    expect(seen).toHaveBeenCalled();
  });
  it("still keeps plain editing keys away from document", () => {
    key(root(), "x");
    const seen = vi.fn();
    document.addEventListener("keydown", seen);
    key(input()!, "a");
    document.removeEventListener("keydown", seen);
    expect(seen).not.toHaveBeenCalled();
  });
});

describe("editor blur", () => {
  it("commits the typed value on blur", () => {
    key(root(), "x");
    input()!.value = "42";
    input()!.dispatchEvent(new FocusEvent("blur"));
    expect(onEdit).toHaveBeenCalledWith("A1", "42");
    expect(input()).toBeNull();
  });
  it("Escape cancels without commit, even if blur follows", () => {
    key(root(), "x");
    const i = input()!;
    i.value = "42";
    key(i, "Escape");
    i.dispatchEvent(new FocusEvent("blur"));
    expect(onEdit).not.toHaveBeenCalled();
  });
  it("Enter commits once, blur adds no second commit", () => {
    key(root(), "x");
    const i = input()!;
    i.value = "7";
    key(i, "Enter");
    i.dispatchEvent(new FocusEvent("blur"));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });
});

describe("destroy / restore", () => {
  it("destroy removes the document mouseup listener", () => {
    const spy = vi.spyOn(document, "removeEventListener");
    grid.destroy();
    expect(spy).toHaveBeenCalledWith("mouseup", expect.any(Function));
    spy.mockRestore();
  });
  it("select accepts a range; a rebuilt grid restores it and focus", () => {
    grid.select("B2:C3");
    expect(grid.getSelection()).toBe("B2:C3");
    const sel = grid.getSelection();
    grid.destroy();
    mount();
    grid.select(sel);
    grid.focus();
    expect(grid.getSelection()).toBe("B2:C3");
    expect(document.activeElement).toBe(root());
  });
});
