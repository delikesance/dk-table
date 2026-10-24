// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { createColorPicker, FILL_COLORS, TEXT_COLORS, contrastRatio } from "./colors";

const WHITE = "#ffffff";
const DARK_SURFACE = "#1e1e21";
const INK = "#1d1d1f";

/** Builds a picker with a spy onPick; `sw()` lists its buttons. */
const mk = (kind: "fill" | "text") => {
  const onPick = vi.fn();
  const pop = createColorPicker({ kind, onPick, root: document.body });
  return { pop, onPick, sw: () => [...pop.querySelectorAll<HTMLButtonElement>("button")] };
};
const key = (el: Element, k: string) => el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true }));

describe("contrastRatio", () => {
  it("black/white = 21, same = 1", () => {
    expect(contrastRatio("#000000", WHITE)).toBeCloseTo(21, 0);
    expect(contrastRatio(WHITE, WHITE)).toBeCloseTo(1, 5);
  });
});

describe("palettes", () => {
  it("10 colors each, FR names", () => {
    expect(FILL_COLORS).toHaveLength(10);
    expect(TEXT_COLORS).toHaveLength(10);
    for (const c of [...FILL_COLORS, ...TEXT_COLORS]) expect(c.name.length).toBeGreaterThan(2);
  });
  it("text colors >=4.5 on white and on every fill", () => {
    for (const t of TEXT_COLORS) {
      expect(contrastRatio(t.value, WHITE), t.name).toBeGreaterThanOrEqual(4.5);
      for (const f of FILL_COLORS) {
        expect(contrastRatio(t.value, f.value), `${t.name}/${f.name}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
  it("default ink >=4.5 on every fill; dark-surface text token readable", () => {
    for (const f of FILL_COLORS) expect(contrastRatio(INK, f.value), f.name).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#f2f2f4", DARK_SURFACE)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("color picker", () => {
  it("11 buttons (10 + Aucune), with aria-label", () => {
    const { sw } = mk("fill");
    expect(sw()).toHaveLength(11);
    sw().forEach((b) => expect(b.getAttribute("aria-label")).toBeTruthy());
    expect(sw()[10].getAttribute("aria-label")).toBe("Aucune");
  });
  it("click calls onPick(color) / onPick(null)", () => {
    const { sw, onPick } = mk("text");
    sw()[2].click();
    expect(onPick).toHaveBeenLastCalledWith(TEXT_COLORS[2].value);
    sw()[10].click();
    expect(onPick).toHaveBeenLastCalledWith(null);
  });
  it("arrows move focus, Enter picks, Escape closes", () => {
    const { pop, sw, onPick } = mk("fill");
    sw()[0].focus();
    key(sw()[0], "ArrowRight");
    expect(document.activeElement).toBe(sw()[1]);
    key(sw()[1], "ArrowDown");
    expect(document.activeElement).toBe(sw()[6]);
    key(sw()[6], "ArrowLeft");
    expect(document.activeElement).toBe(sw()[5]);
    key(sw()[5], "Enter");
    expect(onPick).toHaveBeenLastCalledWith(FILL_COLORS[5].value);
    key(sw()[5], "Escape");
    expect(pop.hidden).toBe(true);
  });
  it("setCurrent sets aria-pressed", () => {
    const { pop, sw } = mk("fill");
    pop.setCurrent(FILL_COLORS[3].value);
    expect(sw().filter((b) => b.getAttribute("aria-pressed") === "true")).toEqual([sw()[3]]);
    pop.setCurrent(null);
    expect(sw()[10].getAttribute("aria-pressed")).toBe("true");
  });
});
