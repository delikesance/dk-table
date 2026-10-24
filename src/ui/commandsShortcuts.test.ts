// @vitest-environment jsdom
/** Keyboard shortcuts and palette commands (complements commands/commandsFix tests). */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../io/files", () => ({
  openDocument: vi.fn(async () => null), openPath: vi.fn(),
  saveDocument: vi.fn(async () => "/s.dktable"), saveAs: vi.fn(async () => "/as.dktable"),
  exportCsvFile: vi.fn(), importCsvFile: vi.fn(async () => null),
}));

import * as files from "../io/files";
import { mount, type App } from "./app";
import { setConfirm } from "./fileops";
import { defaultRegistry } from "./palette/registry";

let app: App;
let root: HTMLElement;
const cell = (k: string) => root.querySelector<HTMLElement>(`.dkg-cell[data-key="${k}"]`)!;
const key = (k: string, extra: KeyboardEventInit = {}, target: EventTarget = document) => {
  const e = new KeyboardEvent("keydown", { key: k, ctrlKey: true, bubbles: true, cancelable: true, ...extra });
  target.dispatchEvent(e);
  return e;
};
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  setConfirm(() => true);
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app")!;
  app = mount(root);
});

describe("shortcuts", () => {
  it("Ctrl+Z undoes, Ctrl+Y and Ctrl+Shift+Z redo", () => {
    app.edit("A1", "1");
    key("z");
    expect(cell("A1").textContent).toBe("");
    key("y");
    expect(cell("A1").textContent).toBe("1");
    key("z");
    key("Z", { shiftKey: true });
    expect(cell("A1").textContent).toBe("1");
  });
  it("Ctrl+B and Ctrl+I toggle style", () => {
    app.select("A1");
    key("b"); key("i");
    expect(app.activeStyle()).toEqual({ bold: true, italic: true });
    key("b");
    expect(app.activeStyle().bold).toBe(false);
  });
  it("Ctrl+O opens, Ctrl+S saves, Ctrl+Shift+S saves as", async () => {
    key("o"); key("s"); key("s", { shiftKey: true });
    await flush();
    expect(files.openDocument).toHaveBeenCalledTimes(1);
    expect(files.saveDocument).toHaveBeenCalledTimes(1);
    expect(files.saveAs).toHaveBeenCalledTimes(1);
  });
  it("Ctrl+N resets the workbook", () => {
    app.edit("A1", "1");
    key("n");
    expect(cell("A1").textContent).toBe("");
    expect(app.dirty).toBe(false);
  });
  it("Ctrl+J toggles the tools, Ctrl+K opens the palette", () => {
    const tools = root.querySelector<HTMLElement>(".dk-toolbar__n2")!;
    const before = tools.hidden;
    key("j");
    expect(tools.hidden).toBe(!before);
    key("k");
    expect(document.querySelectorAll(".dk-palette").length).toBe(1);
  });
  it("preventDefault is called for handled keys, not for others or without Ctrl", () => {
    expect(key("b").defaultPrevented).toBe(true);
    expect(key("q").defaultPrevented).toBe(false);
    expect(key("b", { ctrlKey: false }).defaultPrevented).toBe(false);
    expect(key("b", { altKey: true }).defaultPrevented).toBe(false);
  });
});

describe("ignored while editing text", () => {
  const field = (el: HTMLElement) => { document.body.append(el); return el; };
  it.each([["input"], ["textarea"]])("undo/bold shortcuts are left to a %s", (tag) => {
    app.edit("A1", "1");
    app.select("A1");
    const el = field(document.createElement(tag));
    key("z", {}, el); key("y", {}, el); key("b", {}, el); key("i", {}, el);
    expect(cell("A1").textContent).toBe("1");
    expect(app.activeStyle()).toEqual({});
  });
  it("contenteditable also keeps its native shortcuts", () => {
    app.edit("A1", "1");
    const div = field(document.createElement("div"));
    Object.defineProperty(div, "isContentEditable", { value: true });
    key("z", {}, div);
    expect(cell("A1").textContent).toBe("1");
  });
});

describe("palette commands and clear", () => {
  const run = (id: string) => defaultRegistry.list().find((c) => c.id === id)!.run();
  it("file.new resets the workbook", () => {
    app.edit("A1", "1");
    run("file.new");
    expect(cell("A1").textContent).toBe("");
  });
  it("file.new keeps the workbook when the user declines", () => {
    setConfirm(() => false);
    app.edit("A1", "1");
    run("file.new");
    expect(cell("A1").textContent).toBe("1");
  });
  it("view.tools toggles like Ctrl+J", () => {
    const tools = root.querySelector<HTMLElement>(".dk-toolbar__n2")!;
    const before = tools.hidden;
    run("view.tools");
    expect(tools.hidden).toBe(!before);
  });
  it("clearing a range is one undo step", () => {
    ["1", "2", "3"].forEach((v, i) => app.edit(`A${i + 1}`, v));
    const keys = ["A1", "A2", "A3"];
    vi.spyOn(app, "selectedKeys").mockReturnValue(keys);
    cell("A1").dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
    const item = [...document.querySelectorAll<HTMLElement>("[role=menuitem]")].find((e) => e.textContent?.includes("Effacer"))!;
    item.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    item.click();
    app.undo();
    expect(keys.map((k) => cell(k).textContent)).toEqual(["1", "2", "3"]);
  });
});
