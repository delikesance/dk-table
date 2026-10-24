// @vitest-environment jsdom
/** Tests of appWidgets: toolbar / menu / formula bar / tabs callbacks reach the app handle. */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../io/files", () => ({
  openDocument: vi.fn(async () => null), openPath: vi.fn(), saveDocument: vi.fn(async () => "/s.dktable"),
  saveAs: vi.fn(async () => "/as.dktable"), exportCsvFile: vi.fn(async () => null),
  importCsvFile: vi.fn(async () => ({ path: "C:\\d\\data.csv", sheet: { cols: 26, rows: 100, cells: { A1: { raw: "9" } } } })),
}));

import * as files from "../io/files";
import { mount, type App } from "./app";

let app: App;
let root: HTMLElement;
const btn = (a: string) => root.querySelector<HTMLButtonElement>(`.dk-toolbar [data-action="${a}"]`)!;
const menuItem = (label: string) =>
  [...root.querySelectorAll<HTMLElement>(".dk-menus button, .dk-menus [role=menuitem]")].find((e) => e.textContent?.includes(label))!;
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app")!;
  app = mount(root);
});

describe("toolbar -> app", () => {
  it("bold and italic toggle the active cell style", () => {
    app.select("A1");
    btn("bold").click();
    expect(app.activeStyle().bold).toBe(true);
    btn("bold").click();
    expect(app.activeStyle().bold).toBe(false);
    btn("italic").click();
    expect(app.activeStyle().italic).toBe(true);
  });
  it("align buttons set the alignment", () => {
    app.select("A1");
    btn("align-center").click();
    expect(app.activeStyle().align).toBe("center");
  });
  it("onFormat applies the number format from the select", () => {
    app.select("A1");
    const sel = root.querySelector<HTMLSelectElement>(".dk-toolselect")!;
    sel.value = "percent";
    sel.dispatchEvent(new Event("change"));
    expect(app.activeStyle().format).toBe("percent");
  });
  it("undo/redo buttons drive the history", () => {
    app.edit("A1", "1");
    btn("undo").click();
    expect(app.toDoc().sheets[0].cells.A1?.raw ?? "").toBe("");
    btn("redo").click();
    expect(app.toDoc().sheets[0].cells.A1.raw).toBe("1");
  });
  it("open and save buttons call the command hook", () => {
    const cmd = vi.fn();
    app.hooks.command = cmd;
    btn("open").click();
    btn("save").click();
    expect(cmd.mock.calls.map((c) => c[0])).toEqual(["open", "save"]);
  });
});

describe("file menus -> fileops", () => {
  it("Enregistrer sous asks a path and stores it", async () => {
    menuItem("Enregistrer sous").click();
    await flush();
    expect(files.saveAs).toHaveBeenCalled();
    expect(app.path).toBe("/as.dktable");
  });
  it("Importer un CSV adds a sheet named after the file", async () => {
    menuItem("Importer un CSV").click();
    await flush();
    expect(app.sheets().map((s) => s.name)).toEqual(["Feuille 1", "data"]);
  });
  it("Exporter en CSV exports the active sheet", async () => {
    menuItem("Exporter en CSV").click();
    await flush();
    expect(files.exportCsvFile).toHaveBeenCalledTimes(1);
  });
});

describe("formula bar and tabs", () => {
  it("formula bar goto selects the cell", () => {
    const goto = root.querySelector<HTMLInputElement>(".dk-formula input")!;
    goto.value = "C5";
    goto.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    expect(app.selection()).toBe("C5");
  });
});
