// @vitest-environment jsdom
/** App-level conditional formatting: rules repaint on edits, one undo step, persisted, follow row inserts. */
import { beforeEach, describe, expect, it } from "vitest";
import { mount, type App } from "./app";
import type { CfRule } from "../engine/cf/types";

let app: App;
let root: HTMLElement;
const cell = (k: string) => root.querySelector<HTMLElement>(`.dkg-cell[data-key="${k}"]`)!;
const RED = "#fde2e0";
const gt: CfRule = { id: "r1", range: "A1:A5", type: "cell", op: "gt", a: "10", format: { fill: RED, bold: true } };

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app")!;
  app = mount(root);
  app.editMany({ A1: "5", A2: "20" });
});

describe("conditional formatting in the app", () => {
  it("paints matching cells and repaints after an edit", () => {
    app.setCfRules([gt]);
    expect(app.cfRules()).toEqual([gt]);
    expect(cell("A2").style.background).toBe("rgb(253, 226, 224)");
    expect(cell("A2").style.fontWeight).toBe("700");
    expect(cell("A1").style.background).toBe("");
    app.edit("A1", "50");
    expect(cell("A1").style.background).toBe("rgb(253, 226, 224)");
    app.edit("A2", "1");
    expect(cell("A2").style.background).toBe("");
    expect(cell("A2").style.fontWeight).toBe("");
  });
  it("keeps the cell's own style underneath and does not change activeStyle", () => {
    app.select("A1");
    app.style({ italic: true, fill: "#d9f2dd" });
    app.setCfRules([{ ...gt, a: "0" }]);
    expect(cell("A1").style.background).toBe("rgb(253, 226, 224)");
    expect(cell("A1").style.fontStyle).toBe("italic");
    expect(app.activeStyle()).toEqual({ italic: true, fill: "#d9f2dd" });
    app.setCfRules([]);
    expect(cell("A1").style.background).toBe("rgb(217, 242, 221)");
  });
  it("draws data bars", () => {
    app.setCfRules([{ id: "b", range: "A1:A2", type: "bar", color: "#0000f2" }]);
    expect(cell("A2").style.backgroundImage).toContain("linear-gradient");
    expect(cell("A1").style.backgroundImage).toContain("25%");
  });
  it("rule changes are one undo step", () => {
    app.setCfRules([gt]);
    app.undo();
    expect(app.cfRules()).toEqual([]);
    expect(cell("A2").style.background).toBe("");
    app.redo();
    expect(app.cfRules()).toEqual([gt]);
    expect(cell("A2").style.background).toBe("rgb(253, 226, 224)");
  });
  it("is saved with the document and restored on load", () => {
    app.setCfRules([gt]);
    const doc = app.toDoc();
    expect(doc.sheets[0].cf).toEqual([gt]);
    app.loadDoc({ ...doc, sheets: [{ ...doc.sheets[0], cf: [] }] });
    expect(cell("A2").style.background).toBe("");
    app.loadDoc(doc);
    expect(app.cfRules()).toEqual([gt]);
    expect(cell("A2").style.background).toBe("rgb(253, 226, 224)");
  });
  it("sheets without rules are saved without a cf key", () => {
    expect("cf" in app.toDoc().sheets[0]).toBe(false);
  });
  it("ranges follow inserted rows", () => {
    app.setCfRules([gt]);
    app.select("A1");
    app.insertRows();
    expect(app.cfRules()[0].range).toBe("A2:A6");
    expect(cell("A3").style.background).toBe("rgb(253, 226, 224)");
  });
});

describe("conditional formatting from the palette", () => {
  it("palette command opens the dialog; a new rule on the selection paints the grid and survives save/open", async () => {
    const { defaultRegistry } = await import("./palette/registry");
    const { parse, serialize } = await import("../io/format");
    app.select("A1:A2");
    defaultRegistry.list().find((c) => c.id === "format.cf")!.run();
    document.querySelector<HTMLElement>('.dk-dialog [data-action="add"]')!.click();
    const form = document.querySelector<HTMLFormElement>(".dk-cf__form")!;
    expect((form.elements.namedItem("range") as HTMLInputElement).value).toBe("A1:A2");
    (form.elements.namedItem("a") as HTMLInputElement).value = "10";
    form.querySelector<HTMLElement>('[data-action="save"]')!.click();
    expect(cell("A2").style.background).toBe("rgb(253, 226, 224)");
    expect(document.querySelectorAll(".dk-cf__item")).toHaveLength(1);
    const text = serialize(app.toDoc());
    app.setCfRules([]);
    app.loadDoc(parse(text));
    expect(cell("A2").style.background).toBe("rgb(253, 226, 224)");
  });
});
