// @vitest-environment jsdom
/** App-level tests of insert/delete rows/cols: formula rewrite, styles follow, one undo step. */
import { beforeEach, describe, expect, it } from "vitest";
import { mount, type App } from "./app";

let app: App;
let root: HTMLElement;
const raw = (k: string) => app.toDoc().sheets[0].cells[k]?.raw;
const cell = (k: string) => root.querySelector<HTMLElement>(`.dkg-cell[data-key="${k}"]`)!;

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app")!;
  app = mount(root);
});

describe("insertRows / deleteRows", () => {
  it("inserts a row above the selection and rewrites refs; undo restores", () => {
    app.editMany({ A1: "1", A2: "2", A3: "=A1+A2" });
    app.select("A2");
    app.insertRows();
    expect(raw("A4")).toBe("=A1+A3");
    expect(raw("A3")).toBe("2");
    expect(raw("A2")).toBeUndefined();
    expect(cell("A4").textContent).toBe("3");
    app.undo();
    expect(raw("A3")).toBe("=A1+A2");
    expect(raw("A4")).toBeUndefined();
    expect(cell("A3").textContent).toBe("3");
  });
  it("deletes the rows spanned by the selection as one undo step", () => {
    app.editMany({ A1: "1", A2: "2", A3: "3", A4: "=SUM(A1:A3)" });
    app.select("B2:C3");
    app.deleteRows();
    expect(raw("A2")).toBe("=SUM(A1:A1)");
    expect(cell("A2").textContent).toBe("1");
    app.undo();
    expect(raw("A4")).toBe("=SUM(A1:A3)");
  });
  it("moves styles with the cells", () => {
    app.select("A2");
    app.style({ bold: true });
    app.select("A1");
    app.insertRows();
    expect(app.toDoc().sheets[0].styles).toEqual({ A3: { bold: true } });
  });
});

describe("insertCols / deleteCols", () => {
  it("inserts columns left of the selection and deletes them back", () => {
    app.editMany({ A1: "1", B1: "=A1*2" });
    app.select("A1:B1");
    app.insertCols();
    expect(raw("D1")).toBe("=C1*2");
    app.select("A1:B1");
    app.deleteCols();
    expect(raw("B1")).toBe("=A1*2");
  });
  it("a reference to a deleted column becomes #REF!", () => {
    app.editMany({ A1: "1", B1: "=A1" });
    app.select("A1");
    app.deleteCols();
    expect(raw("A1")).toBe("=#REF!");
  });
});
