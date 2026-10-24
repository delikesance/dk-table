// @vitest-environment jsdom
/** App.fitColumns: widths follow the displayed content of the given (or selected) columns; no data loss, grid kept. */
import { beforeEach, describe, expect, it } from "vitest";
import { mount, type App } from "./app";

let app: App;
let root: HTMLElement;
const track = (i: number) => getComputedStyle(root.querySelector<HTMLElement>(".dkg")!).gridTemplateColumns.split(" ")[i];

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app")!;
  app = mount(root);
  app.edit("B1", "Commission_nette_annuelle");
  app.edit("B2", "12");
  app.edit("C1", "ok");
});

describe("cell context menu and palette", () => {
  it("right-click on a cell offers the fit for its columns; the palette has it too", async () => {
    app.select("B1");
    root.querySelector('.dkg-cell[data-key="B1"]')!.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
    const item = [...document.querySelectorAll<HTMLElement>(".dk-menu__item")].find((i) => i.textContent?.startsWith("Ajuster à la largeur"))!;
    item.click();
    expect(track(2)).toBe(`${25 * 7 + 20}px`);
    const { defaultRegistry } = await import("./palette/registry");
    expect(defaultRegistry.list().map((c) => c.label)).toContain("Ajuster à la largeur du contenu");
  });
});

describe("double-click on a header border", () => {
  const dbl = (col: number) => root.querySelectorAll(".dkg-resizer")[col].dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
  it("fits that column; all the selected ones when it is part of a multi-column selection", () => {
    dbl(1);
    expect(track(2)).toBe(`${25 * 7 + 20}px`);
    expect(track(3)).toBe("var(--cell-w)");
    app.select("B1:C1");
    dbl(2);
    expect(track(3)).toBe(`${2 * 7 + 20}px`);
  });
});

describe("fitColumns", () => {
  it("widens a column to its longest displayed text and leaves the others", () => {
    app.fitColumns([1]);
    expect(track(2)).toBe(`${25 * 7 + 20}px`);
    expect(track(3)).toBe("var(--cell-w)");
  });
  it("without argument fits the columns of the selection, as one step that keeps data", () => {
    app.select("B1:C2");
    app.fitColumns();
    expect(track(2)).toBe(`${25 * 7 + 20}px`);
    expect(track(3)).toBe(`${2 * 7 + 20}px`); // narrow content: shrinks too
    expect(root.querySelector<HTMLElement>('.dkg-cell[data-key="B1"]')!.textContent).toBe("Commission_nette_annuelle");
    expect(app.selection()).toBe("B1:C2");
  });
  it("counts the formatted display (currency), not the raw value", () => {
    app.edit("D1", "1234.5");
    app.select("D1");
    app.style({ format: "currency" });
    app.fitColumns([3]);
    expect(parseInt(track(4))).toBeGreaterThan(5 * 7 + 20);
  });
});
