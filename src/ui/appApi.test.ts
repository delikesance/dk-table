// @vitest-environment jsdom
/** Unit tests of the App handle (appApi): edits, undo steps, styles, docs, sheets, recents. */
import { beforeEach, describe, expect, it } from "vitest";
import { mount, type App } from "./app";

let app: App;
let root: HTMLElement;
const cell = (k: string) => root.querySelector<HTMLElement>(`.dkg-cell[data-key="${k}"]`)!;

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app")!;
  app = mount(root);
});

describe("edit / editMany", () => {
  it("edit sets the cell and marks dirty", () => {
    app.edit("A1", "5");
    expect(cell("A1").textContent).toBe("5");
    expect(app.dirty).toBe(true);
  });
  it("editMany is a single undo step", () => {
    app.editMany({ A1: "1", A2: "2", A3: "3" });
    app.undo();
    expect(["A1", "A2", "A3"].map((k) => cell(k).textContent)).toEqual(["", "", ""]);
  });
});

describe("style / activeStyle", () => {
  it("merges patches into the selection and reports the active style", () => {
    app.select("B2");
    app.style({ bold: true });
    app.style({ align: "right" });
    expect(app.activeStyle()).toEqual({ bold: true, align: "right" });
    expect(cell("B2").style.fontWeight).toBe("700");
  });
  it("is empty on an unstyled cell", () => {
    app.select("C3");
    expect(app.activeStyle()).toEqual({});
  });
});

describe("insertFunction", () => {
  it("writes =NAME() in an empty cell", () => {
    app.select("A1");
    app.insertFunction("SUM");
    expect(app.toDoc().sheets[0].cells.A1.raw).toBe("=SUM()");
  });
  it("never overwrites a non-empty cell", () => {
    app.edit("A1", "x");
    app.select("A1");
    app.insertFunction("SUM");
    expect(app.toDoc().sheets[0].cells.A1.raw).toBe("x");
  });
});

describe("toDoc / activeDoc", () => {
  it("includes styles only when present", () => {
    expect(app.toDoc().sheets[0].styles).toBeUndefined();
    app.select("A1");
    app.style({ italic: true });
    expect(app.toDoc().sheets[0].styles).toEqual({ A1: { italic: true } });
    expect(app.activeDoc().styles).toEqual({ A1: { italic: true } });
  });
  it("toDoc returns a copy of the cells", () => {
    app.edit("A1", "1");
    const doc = app.toDoc();
    app.edit("A1", "2");
    expect(doc.sheets[0].cells.A1.raw).toBe("1");
  });
  it("styles survive a loadDoc round trip", () => {
    app.select("A1");
    app.style({ bold: true });
    const doc = app.toDoc();
    app.loadDoc({ version: 1, sheets: [{ id: "z", name: "Z", cols: 26, rows: 100, cells: {} }] });
    app.loadDoc(doc);
    app.select("A1");
    expect(app.activeStyle().bold).toBe(true);
  });
});

describe("sheets", () => {
  it("addSheet names, activates and lists the new sheet", () => {
    app.addSheet();
    expect(app.sheets().map((s) => s.name)).toEqual(["Feuille 1", "Feuille 2"]);
    expect(app.toDoc().active).toBe(app.sheets()[1].id);
  });
  it("switchSheet ignores unknown ids", () => {
    app.edit("A1", "7");
    app.switchSheet("nope");
    expect(cell("A1").textContent).toBe("7");
  });
  it("undo history is per sheet", () => {
    app.edit("A1", "7");
    app.addSheet();
    app.undo();
    app.switchSheet(app.sheets()[0].id);
    expect(cell("A1").textContent).toBe("7");
  });
});

describe("file name from path and recents", () => {
  it.each([["C:\\docs\\a.dktable"], ["/home/u/a.dktable"]])("title uses the basename of %s", (p) => {
    app.loadDoc(app.toDoc(), p);
    expect(document.title).toBe("a.dktable — dk-table");
  });
  it.each([["C:\\docs\\b.dktable"], ["/home/u/b.dktable"]])("recent name is the basename of %s", (p) => {
    app.addRecent(p);
    expect(app.recents()[0]).toEqual({ path: p, name: "b.dktable" });
  });
  it("recents are most-recent first without duplicates", () => {
    app.addRecent("/a.dktable"); app.addRecent("/b.dktable"); app.addRecent("/a.dktable");
    expect(app.recents().map((r) => r.path)).toEqual(["/a.dktable", "/b.dktable"]);
  });
});
