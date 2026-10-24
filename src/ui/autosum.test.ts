// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { mount, type App } from "./app";
import { autosum } from "./autosum";
import { defaultRegistry } from "./palette/registry";

let app: App;
const raw = (k: string) => app.activeDoc().cells[k]?.raw ?? "";
const fill = (cells: Record<string, string>) => app.editMany(cells);

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '<div id="app"></div>';
  app = mount(document.getElementById("app")!);
});

describe("autosum", () => {
  it("sums the contiguous numbers above the active empty cell", () => {
    fill({ A1: "x", A2: "1", A3: "2", A4: "3" });
    app.select("A5");
    expect(autosum(app)).toBe(true);
    expect(raw("A5")).toBe("=SUM(A2:A4)");
  });
  it("falls back to the numbers on the left", () => {
    fill({ A1: "1", B1: "2", C1: "3" });
    app.select("D1");
    autosum(app);
    expect(raw("D1")).toBe("=SUM(A1:C1)");
  });
  it("prefers above over left", () => {
    fill({ A1: "5", A2: "6", B2: "7" });
    app.select("B3");
    autosum(app);
    expect(raw("B3")).toBe("=SUM(B2:B2)");
  });
  it("never overwrites a filled active cell: uses the first empty cell below", () => {
    fill({ A1: "1", A2: "2", A3: "9" });
    app.select("A3");
    autosum(app);
    expect(raw("A3")).toBe("9");
    expect(raw("A4")).toBe("=SUM(A1:A2)");
  });
  it("uses the first empty cell to the right in left mode", () => {
    fill({ A1: "1", B1: "2", C1: "9" });
    app.select("C1");
    autosum(app);
    expect(raw("C1")).toBe("9");
    expect(raw("D1")).toBe("=SUM(A1:B1)");
  });
  it("does nothing without numbers nearby", () => {
    app.select("C3");
    expect(autosum(app)).toBe(false);
    expect(raw("C3")).toBe("");
  });
  it("Alt+= and the palette command run it", () => {
    fill({ A1: "1", A2: "2" });
    app.select("A3");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "=", altKey: true, bubbles: true, cancelable: true }));
    expect(raw("A3")).toBe("=SUM(A1:A2)");
    app.select("A5");
    fill({ A4: "4" });
    defaultRegistry.list().find((c) => c.id === "edit.autosum")!.run();
    expect(raw("A5")).toBe("=SUM(A1:A4)");
  });
  it("toolbar sum button runs it", () => {
    fill({ A1: "1", A2: "2" });
    app.select("A3");
    document.querySelector<HTMLButtonElement>('.dk-toolbar [data-action="sum"]')!.click();
    expect(raw("A3")).toBe("=SUM(A1:A2)");
  });
});
