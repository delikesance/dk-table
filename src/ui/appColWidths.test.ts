// @vitest-environment jsdom
/** Column widths are saved in the document, restored on load and undoable. */
import { beforeEach, describe, expect, it } from "vitest";
import { mount, type App } from "./app";

let app: App;
let root: HTMLElement;
const track = (i: number) => getComputedStyle(root.querySelector<HTMLElement>(".dkg")!).gridTemplateColumns.split(" ")[i];
const drag = (col: number, dx: number) => {
  const grip = root.querySelectorAll(".dkg-resizer")[col];
  grip.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 100 }));
  document.dispatchEvent(new MouseEvent("mousemove", { clientX: 100 + dx }));
  document.dispatchEvent(new MouseEvent("mouseup"));
};

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app")!;
  app = mount(root);
});

describe("column widths persistence", () => {
  it("toDoc saves manual widths by letter; none for untouched sheets", () => {
    expect(app.toDoc().sheets[0].colWidths).toBeUndefined();
    drag(1, 50);
    expect(app.toDoc().sheets[0].colWidths).toEqual({ B: 146 });
  });
  it("saves fitted widths too, and restores them on loadDoc", () => {
    app.edit("C1", "Commission_nette_annuelle");
    app.fitColumns([2]);
    const doc = JSON.parse(JSON.stringify(app.toDoc()));
    expect(doc.sheets[0].colWidths).toEqual({ C: 25 * 7 + 20 });
    app.loadDoc({ ...doc, sheets: [{ ...doc.sheets[0], colWidths: { A: 120, C: 200 } }] }, undefined);
    expect(track(1)).toBe("120px");
    expect(track(2)).toBe("var(--cell-w)");
    expect(track(3)).toBe("200px");
  });
  it("loads files without widths", () => {
    const doc = app.toDoc();
    app.loadDoc(doc, undefined);
    expect(track(1)).toBe("var(--cell-w)");
  });
  it("a resize is one undo step, redo restores it", () => {
    drag(0, 40);
    expect(track(1)).toBe("136px");
    app.undo();
    expect(track(1)).toBe("var(--cell-w)");
    app.redo();
    expect(track(1)).toBe("136px");
  });
  it("a resize marks the document as modified", () => {
    app.markSaved();
    drag(0, 40);
    expect(document.title).toMatch(/\*|•|●/);
  });
  it("widths follow the columns when a column is inserted", () => {
    drag(1, 50);
    app.select("A1");
    app.insertCols();
    expect(app.toDoc().sheets[0].colWidths).toEqual({ C: 146 });
  });
});
