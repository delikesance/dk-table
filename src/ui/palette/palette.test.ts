// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPalette } from "./palette";
import { createRegistry } from "./registry";

const key = (k: string, extra: KeyboardEventInit = {}) =>
  new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true, ...extra });

function setup() {
  document.body.innerHTML = "";
  const registry = createRegistry();
  const run = vi.fn();
  registry.register({ id: "a", label: "Insert row", keywords: ["add"], shortcut: "Ctrl+I", run });
  registry.register({ id: "b", label: "Delete row", run });
  registry.register({ id: "c", label: "Sort A-Z", run });
  const palette = createPalette({ registry });
  return { registry, run, palette };
}
const labels = () => [...document.querySelectorAll(".dk-palette__item")].map((e) => e.textContent ?? "");
const input = () => document.querySelector<HTMLInputElement>(".dk-palette__input")!;

describe("registry", () => {
  it("registers, unregisters and tracks recents", () => {
    const r = createRegistry();
    const off = r.register({ id: "x", label: "X", run() {} });
    r.register({ id: "y", label: "Y", run() {} });
    expect(r.list().map((c) => c.id)).toEqual(["x", "y"]);
    r.markUsed("y");
    expect(r.recentRank("y")).toBe(0);
    expect(r.recentRank("x")).toBe(-1);
    off();
    expect(r.list().map((c) => c.id)).toEqual(["y"]);
  });
});

describe("createPalette", () => {
  beforeEach(() => { document.body.innerHTML = ""; });

  it("opens with Ctrl+K and closes with Esc", () => {
    const { palette } = setup();
    document.dispatchEvent(key("k", { ctrlKey: true }));
    expect(palette.isOpen()).toBe(true);
    expect(input()).not.toBeNull();
    input().dispatchEvent(key("Escape"));
    expect(palette.isOpen()).toBe(false);
    expect(document.querySelector(".dk-palette")).toBeNull();
  });

  it("lists commands with shortcuts", () => {
    const { palette } = setup();
    palette.open();
    expect(labels()).toHaveLength(3);
    expect(document.querySelector(".dk-kbd")?.textContent).toBe("Ctrl+I");
  });

  it("filters by label and keywords", () => {
    const { palette } = setup();
    palette.open();
    input().value = "sort"; input().dispatchEvent(new Event("input"));
    expect(labels()).toHaveLength(1);
    input().value = "add"; input().dispatchEvent(new Event("input"));
    expect(labels()[0]).toContain("Insert row");
  });

  it("navigates with arrows and runs with Enter, then closes", () => {
    const { palette, run } = setup();
    palette.open();
    input().dispatchEvent(key("ArrowDown"));
    expect(document.querySelectorAll(".dk-palette__item")[1].classList.contains("dk-palette__item--selected")).toBe(true);
    input().dispatchEvent(key("Enter"));
    expect(run).toHaveBeenCalledTimes(1);
    expect(palette.isOpen()).toBe(false);
  });

  it("shows recently used first", () => {
    const { palette } = setup();
    palette.open();
    input().dispatchEvent(key("ArrowDown"));
    input().dispatchEvent(key("Enter"));
    palette.open();
    expect(labels()[0]).toContain("Delete row");
  });

  it("closes on scrim click", () => {
    const { palette } = setup();
    palette.open();
    document.querySelector<HTMLElement>(".dk-scrim")!.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    expect(palette.isOpen()).toBe(false);
  });
});
