// @vitest-environment jsdom
/** Floating mini-bar wiring: visible on a range selection, hidden while editing, actions reach the app. */
import { beforeEach, describe, expect, it } from "vitest";
import { mount, type App } from "./app";

let app: App;
let root: HTMLElement;
const bar = () => root.querySelector<HTMLElement>(".dk-floating")!;
const fbtn = (a: string) => bar().querySelector<HTMLButtonElement>(`[data-action="${a}"]`)!;
const grid = () => root.querySelector<HTMLElement>(".dkg")!;
const key = (k: string, extra: KeyboardEventInit = {}) =>
  grid().dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true, ...extra }));
const range = () => { key("ArrowRight", { shiftKey: true }); };

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app")!;
  app = mount(root);
});

describe("floating bar", () => {
  it("is hidden for a single cell and shown for a range", () => {
    expect(bar().hidden).toBe(true);
    range();
    expect(bar().hidden).toBe(false);
  });
  it("is hidden while editing", async () => {
    range();
    key("F2");
    await Promise.resolve();
    expect(bar().hidden).toBe(true);
  });
  it("bold / percent / fill actions apply to the selection and pressed state follows", () => {
    range();
    fbtn("bold").click();
    expect(app.activeStyle().bold).toBe(true);
    expect(fbtn("bold").getAttribute("aria-pressed")).toBe("true");
    fbtn("percent").click();
    expect(app.activeStyle().format).toBe("percent");
    fbtn("percent").click();
    expect(app.activeStyle().format).toBe("general");
    fbtn("fill").click();
    expect(app.activeStyle().fill).toBeTruthy();
    fbtn("fill").click();
    expect(app.activeStyle().fill).toBeUndefined();
  });
  it("uses Iconoir icons, no text glyphs", () => {
    for (const a of ["percent", "sum", "text"]) {
      expect(fbtn(a).querySelector("svg.dk-icon")).not.toBeNull();
      expect(fbtn(a).textContent!.trim()).toBe("");
    }
  });
  it("text colour is disabled until CellStyle.color exists", () => {
    expect(fbtn("text").disabled).toBe(true);
  });
});
