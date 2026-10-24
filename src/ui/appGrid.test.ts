// @vitest-environment jsdom
/** Tests of appGrid: buildGrid restores selection/focus/styles, cell rendering and number formats. */
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

describe("buildGrid", () => {
  it("keeps the selection when the grid is rebuilt (undo)", () => {
    app.edit("A1", "1");
    app.select("C4");
    app.undo();
    expect(app.selection()).toBe("C4");
  });
  it("puts focus back in the grid after a rebuild", () => {
    app.edit("A1", "1");
    (document.activeElement as HTMLElement | null)?.blur?.();
    app.undo();
    const host = root.querySelector(".dk-app__grid")!;
    expect(host.contains(document.activeElement)).toBe(true);
  });
  it("repaints styles on the rebuilt grid", () => {
    app.select("B2");
    app.style({ bold: true });
    app.addSheet();
    app.switchSheet(app.sheets()[0].id);
    expect(cell("B2").style.fontWeight).toBe("700");
  });
  it("syncs the formula bar with the selected cell", () => {
    app.edit("A1", "=1+2");
    app.select("A1");
    expect(root.querySelector<HTMLInputElement>(".dk-formula__input")!.value).toBe("=1+2");
  });
});

describe("renderCell / format", () => {
  it("renders a live SVG for SPARKLINE and text otherwise", () => {
    ["1", "2", "3"].forEach((v, i) => app.edit(`A${i + 1}`, v));
    app.edit("B1", "=SPARKLINE(A1:A3)");
    expect(cell("B1").querySelector("svg")).not.toBeNull();
    expect(cell("A1").querySelector("svg")).toBeNull();
  });
  it("applies the number format to the displayed value", () => {
    app.edit("A1", "0.5");
    app.select("A1");
    app.style({ format: "percent" });
    expect(cell("A1").textContent?.replace(/\s/g, "")).toBe("50%");
    app.undo(); // rebuild path uses the same formatter
    app.redo();
    expect(cell("A1").textContent?.replace(/\s/g, "")).toBe("50%");
  });
  it("shows the raw value unformatted without a format", () => {
    app.edit("A1", "0.5");
    expect(cell("A1").textContent).toBe("0.5");
  });
});

describe("cut", () => {
  it("Ctrl+X clears the range in one undo step", async () => {
    app.edit("A1", "1"); app.edit("B1", "2");
    await Promise.resolve();
    app.select("A1:B1");
    const e = new Event("cut", { bubbles: true, cancelable: true }) as Event & { clipboardData: unknown };
    e.clipboardData = { setData: () => {}, getData: () => "" };
    root.querySelector(".dkg")!.dispatchEvent(e);
    expect(cell("A1").textContent).toBe(""); expect(cell("B1").textContent).toBe("");
    await Promise.resolve();
    app.undo();
    expect(cell("A1").textContent).toBe("1"); expect(cell("B1").textContent).toBe("2");
  });
});
