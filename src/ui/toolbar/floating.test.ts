// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { placeFloating, createFloatingBar, type FloatingActionId } from "./floating";

const bar = { width: 200, height: 40 };
const vp = { width: 1000, height: 800 };

describe("placeFloating", () => {
  it("places above by default with >=8px margin", () => {
    const p = placeFloating({ top: 300, left: 400, width: 100, height: 28 }, bar, vp);
    expect(p.placement).toBe("above");
    expect(p.top).toBeLessThanOrEqual(300 - 40 - 8);
  });
  it("falls below when no room above", () => {
    const p = placeFloating({ top: 20, left: 400, width: 100, height: 28 }, bar, vp);
    expect(p.placement).toBe("below");
    expect(p.top).toBeGreaterThanOrEqual(48 + 8);
  });
  it("clamps left and right inside the viewport", () => {
    const l = placeFloating({ top: 300, left: 0, width: 20, height: 28 }, bar, vp);
    expect(l.left).toBeGreaterThanOrEqual(8);
    const r = placeFloating({ top: 300, left: 990, width: 10, height: 28 }, bar, vp);
    expect(r.left + 200).toBeLessThanOrEqual(1000 - 8);
  });
});

describe("createFloatingBar", () => {
  const mk = () => {
    const root = document.createElement("div");
    const onAction = vi.fn();
    const fb = createFloatingBar(root, onAction);
    return { root, onAction, fb, el: root.querySelector<HTMLElement>('[role="toolbar"]')! };
  };
  it("has toolbar role, FR label, focusable buttons", () => {
    const { el } = mk();
    expect(el.getAttribute("aria-label")).toBeTruthy();
    const btns = el.querySelectorAll("button");
    expect(btns.length).toBe(6);
    btns.forEach((b) => { expect(b.type).toBe("button"); expect(b.getAttribute("aria-label")).toBeTruthy(); });
  });
  it("show/hide toggles visibility and positions", () => {
    const { el, fb } = mk();
    expect(el.hidden).toBe(true);
    fb.show({ top: 300, left: 400, width: 100, height: 28 });
    expect(el.hidden).toBe(false);
    expect(el.style.top).toMatch(/px$/);
    fb.hide();
    expect(el.hidden).toBe(true);
  });
  it("click triggers onAction with the right id", () => {
    const { el, onAction } = mk();
    const ids: FloatingActionId[] = ["bold", "italic", "fill", "text", "percent", "sum"];
    ids.forEach((id) => el.querySelector<HTMLButtonElement>(`[data-action="${id}"]`)!.click());
    expect(onAction.mock.calls.map((c) => c[0])).toEqual(ids);
  });
  it("setPressed sets aria-pressed", () => {
    const { el, fb } = mk();
    const b = el.querySelector('[data-action="bold"]')!;
    expect(b.getAttribute("aria-pressed")).toBe("false");
    fb.setPressed("bold", true);
    expect(b.getAttribute("aria-pressed")).toBe("true");
  });
});
