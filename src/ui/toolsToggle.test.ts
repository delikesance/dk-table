// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { mount } from "./app";
import { defaultRegistry } from "./palette/registry";

let root: HTMLElement;
const tools = () => root.querySelector<HTMLElement>(".dk-toolbar__n2")!;
const side = () => root.querySelector<HTMLElement>(".dk-sidebar")!;
const fresh = () => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app")!;
  mount(root);
};
const key = (k: string) =>
  document.dispatchEvent(new KeyboardEvent("keydown", { key: k, ctrlKey: true, bubbles: true, cancelable: true }));

beforeEach(() => { localStorage.clear(); fresh(); });

describe("tools deployment (N2 only; base bar stays visible)", () => {
  it("N1 base bar is visible on arrival", () => {
    expect(root.querySelector<HTMLElement>(".dk-app__tools")!.hidden).toBe(false);
    expect(root.querySelector('[data-action="bold"]')!.closest("[hidden]")).toBeNull();
  });

  it("Ctrl+J toggles tools and sidebar", () => {
    key("j");
    expect(tools().hidden).toBe(false);
    expect(side().hidden).toBe(false);
    key("j");
    expect(tools().hidden).toBe(true);
  });

  it("palette command toggles tools", () => {
    const cmd = defaultRegistry.list().find((c) => c.id === "view.tools")!;
    expect(cmd.label).toBe("Afficher/Masquer les outils");
    cmd.run();
    expect(tools().hidden).toBe(false);
    cmd.run();
    expect(tools().hidden).toBe(true);
  });

  it("state persists across remount (key dk-table.tools)", () => {
    key("j");
    expect(localStorage.getItem("dk-table.tools")).toBe("1");
    fresh();
    expect(tools().hidden).toBe(false);
    expect(side().hidden).toBe(false);
    key("j");
    fresh();
    expect(tools().hidden).toBe(true);
  });
});
