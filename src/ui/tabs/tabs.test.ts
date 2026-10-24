// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { createSheetTabs } from "./tabs";

/** Build tabs with spy callbacks. */
function setup(confirm = () => true) {
  const host = document.createElement("div");
  const o = { onAdd: vi.fn(), onRename: vi.fn(), onDelete: vi.fn(), onSwitch: vi.fn(), onReorder: vi.fn(), confirm };
  const t = createSheetTabs(host, o);
  t.setSheets([{ id: "a", name: "A" }, { id: "b", name: "B" }]);
  t.setActive("a");
  return { host, o, t };
}
const tabs = (h: HTMLElement) => [...h.querySelectorAll<HTMLElement>(".dk-tab:not(.dk-tab--add)")];
const key = (el: Element, k: string, extra: KeyboardEventInit = {}) =>
  el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, ...extra }));

describe("createSheetTabs", () => {
  it("renders tabs and marks active", () => {
    const { host } = setup();
    expect(tabs(host).map((x) => x.textContent)).toEqual(["A", "B"]);
    expect(tabs(host)[0].classList.contains("dk-tab--active")).toBe(true);
    expect(tabs(host)[0].getAttribute("aria-selected")).toBe("true");
  });
  it("switches on click and setActive updates", () => {
    const { host, o, t } = setup();
    tabs(host)[1].click();
    expect(o.onSwitch).toHaveBeenCalledWith("b");
    t.setActive("b");
    expect(tabs(host)[1].classList.contains("dk-tab--active")).toBe(true);
  });
  it("adds via + button", () => {
    const { host, o } = setup();
    host.querySelector<HTMLElement>(".dk-tab--add")!.click();
    expect(o.onAdd).toHaveBeenCalled();
  });
  it("renames on dblclick + Enter, cancels on Escape", () => {
    const { host, o } = setup();
    tabs(host)[0].dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    let inp = host.querySelector<HTMLInputElement>("input")!;
    inp.value = "Z";
    key(inp, "Enter");
    expect(o.onRename).toHaveBeenCalledWith("a", "Z");
    tabs(host)[1].dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    inp = host.querySelector<HTMLInputElement>("input")!;
    inp.value = "Q";
    key(inp, "Escape");
    expect(o.onRename).toHaveBeenCalledTimes(1);
    expect(host.querySelector("input")).toBeNull();
  });
  it("deletes with Delete key only after confirm", () => {
    const no = setup(() => false);
    key(tabs(no.host)[1], "Delete");
    expect(no.o.onDelete).not.toHaveBeenCalled();
    const yes = setup();
    key(tabs(yes.host)[1], "Delete");
    expect(yes.o.onDelete).toHaveBeenCalledWith("b");
  });
  it("does not delete the last sheet", () => {
    const { host, o, t } = setup();
    t.setSheets([{ id: "a", name: "A" }]);
    key(tabs(host)[0], "Delete");
    expect(o.onDelete).not.toHaveBeenCalled();
  });
  it("arrow keys switch; Alt+Arrow reorders", () => {
    const { host, o } = setup();
    key(tabs(host)[0], "ArrowRight");
    expect(o.onSwitch).toHaveBeenCalledWith("b");
    key(tabs(host)[0], "ArrowRight", { altKey: true });
    expect(o.onReorder).toHaveBeenCalledWith(["b", "a"]);
  });
});
