// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { showContextMenu } from "./contextmenu";

const key = (k: string) => new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true });
const menu = () => document.querySelector<HTMLElement>(".dk-menu");

describe("showContextMenu", () => {
  beforeEach(() => { document.body.innerHTML = ""; });

  it("renders items, separators, shortcuts, disabled", () => {
    showContextMenu(10, 10, [
      { label: "Copy", shortcut: "Ctrl+C" },
      { separator: true },
      { label: "Paste", disabled: true },
    ]);
    expect(document.querySelectorAll(".dk-menu__item")).toHaveLength(2);
    expect(document.querySelectorAll(".dk-menu__sep")).toHaveLength(1);
    expect(document.querySelector(".dk-kbd")?.textContent).toBe("Ctrl+C");
    expect(document.querySelectorAll(".dk-menu__item--disabled")).toHaveLength(1);
  });

  it("click runs action and closes; disabled does not run", () => {
    const a = vi.fn(); const b = vi.fn();
    showContextMenu(0, 0, [{ label: "A", action: a }, { label: "B", action: b, disabled: true }]);
    const items = document.querySelectorAll<HTMLElement>(".dk-menu__item");
    items[1].click();
    expect(b).not.toHaveBeenCalled();
    items[0].click();
    expect(a).toHaveBeenCalledTimes(1);
    expect(menu()).toBeNull();
  });

  it("closes on Esc and outside mousedown", () => {
    showContextMenu(0, 0, [{ label: "A" }]);
    document.dispatchEvent(key("Escape"));
    expect(menu()).toBeNull();
    showContextMenu(0, 0, [{ label: "A" }]);
    document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    expect(menu()).toBeNull();
  });

  it("keyboard nav skips disabled/separators, wraps, Enter activates", () => {
    const b = vi.fn();
    showContextMenu(0, 0, [{ label: "A" }, { separator: true }, { label: "X", disabled: true }, { label: "B", action: b }]);
    const hov = () => [...document.querySelectorAll(".dk-menu__item")].findIndex((e) => e.classList.contains("dk-menu__item--hover"));
    document.dispatchEvent(key("ArrowDown")); expect(hov()).toBe(0);
    document.dispatchEvent(key("ArrowDown")); expect(hov()).toBe(2); // B (X disabled skipped)
    document.dispatchEvent(key("ArrowDown")); expect(hov()).toBe(0); // wrap
    document.dispatchEvent(key("ArrowUp")); expect(hov()).toBe(2);
    document.dispatchEvent(key("Enter"));
    expect(b).toHaveBeenCalled();
    expect(menu()).toBeNull();
  });

  it("stays within viewport", () => {
    Object.defineProperty(window, "innerWidth", { value: 500, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 400, configurable: true });
    const spy = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
      { width: 200, height: 100, top: 0, left: 0, right: 200, bottom: 100, x: 0, y: 0, toJSON() {} } as DOMRect);
    showContextMenu(480, 390, [{ label: "A" }]);
    expect(menu()!.style.left).toBe("292px");
    expect(menu()!.style.top).toBe("292px");
    spy.mockRestore();
  });

  it("opens submenu with ArrowRight and activates its item", () => {
    const sub = vi.fn();
    showContextMenu(0, 0, [{ label: "More", submenu: [{ label: "Sub", action: sub }] }]);
    document.dispatchEvent(key("ArrowDown"));
    document.dispatchEvent(key("ArrowRight"));
    expect(document.querySelectorAll(".dk-menu")).toHaveLength(2);
    document.dispatchEvent(key("ArrowDown"));
    document.dispatchEvent(key("Enter"));
    expect(sub).toHaveBeenCalled();
    expect(menu()).toBeNull();
  });

  it("replaces a previously open menu and returns close()", () => {
    showContextMenu(0, 0, [{ label: "A" }]);
    const close = showContextMenu(0, 0, [{ label: "B" }]);
    expect(document.querySelectorAll(".dk-menu")).toHaveLength(1);
    close();
    expect(menu()).toBeNull();
  });
});
