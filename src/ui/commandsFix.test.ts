// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount, type App } from "./app";

let app: App;
let root: HTMLElement;
const cell = (k: string) => root.querySelector<HTMLElement>(`.dkg-cell[data-key="${k}"]`)!;

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app")!;
  app = mount(root);
});

describe("grouped edit / clear", () => {
  it("editMany is one undo step and one refresh", () => {
    app.edit("A1", "1"); app.edit("A2", "2"); app.edit("A3", "3");
    const title = vi.spyOn(document, "title", "set");
    app.editMany({ A1: "", A2: "", A3: "" });
    expect(title).toHaveBeenCalledTimes(1);
    expect(cell("A2").textContent).toBe("");
    app.undo();
    expect(["A1", "A2", "A3"].map((k) => cell(k).textContent)).toEqual(["1", "2", "3"]);
  });

  it("clearing a 3-cell range via context menu is one undo step", () => {
    app.edit("A1", "1"); app.edit("A2", "2"); app.edit("A3", "3");
    app.select("A1");
    const keys = ["A1", "A2", "A3"];
    vi.spyOn(app, "selectedKeys").mockReturnValue(keys);
    cell("A1").dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
    const item = [...document.querySelectorAll<HTMLElement>("[role=menuitem]")]
      .find((e) => e.textContent?.includes("Effacer"))!;
    item.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    item.click();
    expect(keys.map((k) => cell(k).textContent)).toEqual(["", "", ""]);
    app.undo();
    expect(keys.map((k) => cell(k).textContent)).toEqual(["1", "2", "3"]);
  });
});

describe("insertFunction", () => {
  it("writes a complete =SUM() in an empty cell (no #VALUE!)", () => {
    app.select("B1");
    app.insertFunction("SUM");
    expect(app.toDoc().sheets[0].cells.B1?.raw).toBe("=SUM()");
  });
  it("does not overwrite existing content", () => {
    app.edit("B1", "42"); app.select("B1");
    app.insertFunction("SUM");
    expect(cell("B1").textContent).toBe("42");
  });
});

describe("remount and FR texts", () => {
  it("two mounts create a single palette, in French", () => {
    document.body.innerHTML = '<div id="app"></div>';
    mount(document.getElementById("app")!);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }));
    expect(document.querySelectorAll(".dk-palette").length).toBe(1);
    expect(document.querySelector<HTMLInputElement>(".dk-palette__input")!.placeholder).toBe("Taper une commande…");
    expect(document.querySelector(".dk-palette")!.getAttribute("aria-label")).toBe("Palette de commandes");
  });
});
