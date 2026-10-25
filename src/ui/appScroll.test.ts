// @vitest-environment jsdom
/** Per-sheet scroll and selection: switching sheets restores each sheet's own view. */
import { beforeEach, describe, expect, it } from "vitest";
import { mount, type App } from "./app";

let app: App;
let root: HTMLElement;
const grid = () => root.querySelector<HTMLElement>(".dkg")!;

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app")!;
  app = mount(root);
});

describe("scroll per sheet", () => {
  it("each sheet keeps its own scroll position", () => {
    const [a] = app.sheets();
    grid().scrollTop = 400;
    app.addSheet();
    const b = app.sheets()[1];
    expect(grid().scrollTop).toBe(0); // a new sheet starts at the top
    grid().scrollTop = 900;
    app.switchSheet(a.id);
    expect(grid().scrollTop).toBe(400);
    app.switchSheet(b.id);
    expect(grid().scrollTop).toBe(900);
  });
  it("each sheet keeps its own selection", () => {
    const [a] = app.sheets();
    app.select("C4");
    app.addSheet();
    expect(app.selection()).toBe("A1");
    app.select("B7");
    app.switchSheet(a.id);
    expect(app.selection()).toBe("C4");
  });
  it("a rebuild of the same sheet keeps its scroll", () => {
    grid().scrollTop = 300;
    app.addSheet();
    app.undo(); // no-op undo on the new sheet must not disturb scroll bookkeeping
    expect(grid().scrollTop).toBe(0);
  });
});
