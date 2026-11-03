// @vitest-environment jsdom
/** App-level tests of cell merging: layout, lost values, navigation, undo, structure, persistence. */
import { beforeEach, describe, expect, it } from "vitest";
import { mount, type App } from "./app";
import { parse as parseDkt, serialize as serializeDkt } from "../io/format";

let app: App;
let root: HTMLElement;
const raw = (k: string) => app.toDoc().sheets[0].cells[k]?.raw;
const merges = () => app.toDoc().sheets[0].merges;
const cell = (k: string) => root.querySelector<HTMLElement>(`.dkg-cell[data-key="${k}"]`)!;
const key = (k: string) => new KeyboardEvent("keydown", { key: k, bubbles: true });

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app")!;
  app = mount(root);
});

describe("mergeCells", () => {
  it("spans the anchor, hides the others, keeps only the top-left value", () => {
    app.editMany({ B2: "x", C2: "lost", B3: "y" });
    app.select("B2:C3");
    app.mergeCells();
    expect(merges()).toEqual(["B2:C3"]);
    expect(raw("B2")).toBe("x");
    expect(raw("C2")).toBeUndefined();
    expect(raw("B3")).toBeUndefined();
    expect(cell("B2").style.gridRow).toBe("3 / span 2");
    expect(cell("B2").style.gridColumn).toBe("3 / span 2");
    expect(cell("C2").style.display).toBe("none");
    expect(app.selection()).toBe("B2");
    expect(app.selectionMerged()).toBe(true);
  });
  it("does nothing for a single cell", () => {
    app.select("B2");
    app.mergeCells();
    expect(merges()).toBeUndefined();
  });
  it("is one undo step that restores values and layout", () => {
    app.editMany({ B2: "x", C2: "lost" });
    app.select("B2:C2");
    app.mergeCells();
    app.undo();
    expect(merges()).toBeUndefined();
    expect(raw("C2")).toBe("lost");
    expect(cell("C2").style.display).toBe("");
    expect(cell("B2").style.gridColumn).toBe("3");
  });
  it("unmerges and keeps the anchor value", () => {
    app.editMany({ B2: "x" });
    app.select("B2:C2");
    app.mergeCells();
    app.unmergeCells();
    expect(merges()).toBeUndefined();
    expect(raw("B2")).toBe("x");
    expect(cell("C2").style.display).toBe("");
    expect(cell("B2").style.gridColumn).toBe("3");
  });
  it("clicking an absorbed cell selects the anchor; arrows leave the merge", () => {
    app.select("B2:C3");
    app.mergeCells();
    app.select("C3");
    expect(app.selection()).toBe("B2");
    root.querySelector<HTMLElement>(".dkg")!.dispatchEvent(key("ArrowRight"));
    expect(app.selection()).toBe("D2");
    app.select("B2");
    root.querySelector<HTMLElement>(".dkg")!.dispatchEvent(key("ArrowDown"));
    expect(app.selection()).toBe("B4");
  });
  it("a new merge over an existing one replaces it", () => {
    app.select("B2:C2"); app.mergeCells();
    app.select("C2:D2"); app.mergeCells();
    expect(merges()).toEqual(["C2:D2"]);
  });
});

describe("merges follow structure edits and files", () => {
  it("inserting a row above moves the merge", () => {
    app.select("B2:C3"); app.mergeCells();
    app.select("A1"); app.insertRows();
    expect(merges()).toEqual(["B3:C4"]);
    app.undo();
    expect(merges()).toEqual(["B2:C3"]);
  });
  it("round-trips through .dktable", () => {
    app.select("B2:C3"); app.mergeCells();
    const doc = parseDkt(serializeDkt(app.toDoc()));
    expect(doc.sheets[0].merges).toEqual(["B2:C3"]);
    app.loadDoc(doc);
    expect(cell("B2").style.gridRow).toBe("3 / span 2");
  });
});
