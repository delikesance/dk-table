// @vitest-environment jsdom
/** Column sort wiring: app.sortColumn, N2 toolbar buttons, context menu entries, palette commands. */
import { beforeEach, describe, expect, it } from "vitest";
import { mount, type App } from "./app";
import { defaultRegistry } from "./palette/registry";

let app: App;
let root: HTMLElement;
const raw = (k: string) => app.activeDoc().cells[k]?.raw ?? "";
const col = (c: string) => [1, 2, 3, 4].map((r) => raw(c + r));

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app")!;
  app = mount(root);
  app.editMany({ A1: "Nom", B1: "N", A2: "b", B2: "2", A3: "c", B3: "3", A4: "a", B4: "1" });
  app.select("A2");
});

describe("sort column", () => {
  it("app.sortColumn(false/true) sorts rows of the active column's block, undoable", () => {
    expect(app.sortColumn(false)).toBe(true);
    expect(col("A")).toEqual(["Nom", "a", "b", "c"]);
    expect(col("B")).toEqual(["N", "1", "2", "3"]);
    app.sortColumn(true);
    expect(col("A")).toEqual(["Nom", "c", "b", "a"]);
    app.undo();
    expect(col("A")).toEqual(["Nom", "a", "b", "c"]);
  });
  it("N2 toolbar buttons sort", () => {
    const b = (a: string) => root.querySelector<HTMLButtonElement>(`.dk-toolbar__n2 [data-action="${a}"]`)!;
    expect(b("sort-asc").getAttribute("aria-label")).toBe("Trier A→Z");
    b("sort-asc").click();
    expect(col("A")).toEqual(["Nom", "a", "b", "c"]);
    b("sort-desc").click();
    expect(col("A")).toEqual(["Nom", "c", "b", "a"]);
  });
  it("context menu offers both sorts", () => {
    root.querySelector(".dkg")!.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
    const items = [...document.querySelectorAll<HTMLElement>("[role=menuitem]")];
    const az = items.find((i) => i.textContent?.includes("Trier A→Z"))!;
    expect(items.some((i) => i.textContent?.includes("Trier Z→A"))).toBe(true);
    az.click();
    expect(col("A")).toEqual(["Nom", "a", "b", "c"]);
  });
  it("palette commands exist", () => {
    defaultRegistry.list().find((c) => c.id === "data.sort-desc")!.run();
    expect(col("A")).toEqual(["Nom", "c", "b", "a"]);
    expect(defaultRegistry.list().some((c) => c.id === "data.sort-asc")).toBe(true);
  });
});
