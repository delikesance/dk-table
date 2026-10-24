// @vitest-environment jsdom
/** App-level cross-sheet references: the model binds every sheet into one workbook. */
import { beforeEach, describe, expect, it } from "vitest";
import { mount, type App } from "./app";

let app: App;
let root: HTMLElement;
const cell = (k: string) => root.querySelector<HTMLElement>(`.dkg-cell[data-key="${k}"]`)!;
const idOf = (name: string) => app.sheets().find((s) => s.name === name)!.id;

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app")!;
  app = mount(root);
});

describe("cross-sheet references in the app", () => {
  it("editing Feuille 1!A1 updates a formula on Feuille 2", () => {
    app.addSheet();
    app.edit("A1", "='Feuille 1'!A1*2");
    app.switchSheet(idOf("Feuille 1"));
    app.edit("A1", "21");
    app.switchSheet(idOf("Feuille 2"));
    expect(cell("A1").textContent).toBe("42");
  });
  it("resolves refs after loadDoc, whatever the sheet order", () => {
    app.loadDoc({
      version: 1, active: "b",
      sheets: [
        { id: "a", name: "Total", cols: 26, rows: 100, cells: { A1: { raw: "=SUM(Ventes!A1:A2)" } } },
        { id: "b", name: "Ventes", cols: 26, rows: 100, cells: { A1: { raw: "3" }, A2: { raw: "4" } } },
      ],
    });
    app.edit("A2", "10");
    app.switchSheet("a");
    expect(cell("A1").textContent).toBe("13");
  });
  it("undo on the source sheet updates dependents on other sheets", () => {
    app.edit("A1", "1");
    app.addSheet();
    app.edit("B1", "='feuille 1'!A1+1");
    app.switchSheet(idOf("Feuille 1"));
    app.edit("A1", "5");
    app.undo();
    app.switchSheet(idOf("Feuille 2"));
    expect(cell("B1").textContent).toBe("2");
  });
});
