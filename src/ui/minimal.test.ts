// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { mount } from "./app";
import { icon, ICON_NAMES } from "./icons";

let root: HTMLElement;
const toggle = () => root.querySelector<HTMLButtonElement>('[data-action="toggle-tools"]')!;
const tools = () => root.querySelector<HTMLElement>(".dk-app__tools")!;
const side = () => root.querySelector<HTMLElement>(".dk-sidebar")!;

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app")!;
  mount(root);
});

describe("minimal mode (default)", () => {
  it("shows only the sheet: tools and sidebar hidden, grid visible", () => {
    expect(tools().hidden).toBe(true);
    expect(side().hidden).toBe(true);
    expect(root.querySelector(".dk-app")!.classList.contains("dk-app--minimal")).toBe(true);
    expect(root.querySelector<HTMLElement>(".dkg")!.closest("[hidden]")).toBeNull();
  });

  it("toggle button deploys then hides the tools", () => {
    expect(toggle().getAttribute("aria-expanded")).toBe("false");
    toggle().click();
    expect(tools().hidden).toBe(false);
    expect(side().hidden).toBe(false);
    expect(toggle().getAttribute("aria-expanded")).toBe("true");
    toggle().click();
    expect(tools().hidden).toBe(true);
    expect(side().hidden).toBe(true);
  });
});

describe("icons module", () => {
  it("returns inline svg using currentColor only", () => {
    for (const n of ICON_NAMES) {
      const s = icon(n);
      expect(s, n).toContain("<svg");
      expect(s, n).toContain("currentColor");
      expect(s, n).not.toMatch(/#[0-9a-f]{3,6}/i);
    }
  });

  it("toolbar and toggle buttons use icons.ts markup", () => {
    const paths = (html: string) => {
      const d = document.createElement("div");
      d.innerHTML = html;
      return [...d.querySelectorAll("path")].map((p) => p.getAttribute("d"));
    };
    expect(paths(toggle().innerHTML)).toEqual(paths(icon("tools")));
    const undo = root.querySelector('[data-action="undo"]')!;
    expect(undo.querySelector("svg.dk-icon")).not.toBeNull();
    expect(paths(undo.innerHTML)).toEqual(paths(icon("undo")));
  });
});
