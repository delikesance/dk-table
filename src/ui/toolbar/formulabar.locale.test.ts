// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFormulaBar } from "./formulabar";

/**
 * Formula bar in a French browser: the fx field shows `;` and `,` (stored `,` and `.`),
 * Enter commits the canonical text, Esc reverts to the localized text.
 */
describe("formula bar, fr syntax", () => {
  beforeEach(() => Object.defineProperty(navigator, "language", { value: "fr-FR", configurable: true }));
  afterEach(() => { delete (navigator as { language?: string }).language; });

  function mk() {
    const host = document.createElement("div");
    const onCommit = vi.fn();
    const bar = createFormulaBar(host, { onGoto: vi.fn(), onCommit });
    return { bar, onCommit, fx: host.querySelector<HTMLInputElement>(".dk-formula__input")! };
  }
  const enter = (el: HTMLElement) =>
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));

  it("shows the stored formula in fr syntax", () => {
    const { bar, fx } = mk();
    bar.setCell("C7", "=SUM(A1,2.5)");
    expect(fx.value).toBe("=SUM(A1;2,5)");
  });
  it("commits the typed fr formula as canonical text", () => {
    const { bar, onCommit, fx } = mk();
    bar.setCell("A1", "1"); fx.value = "=A2;2,5";
    enter(fx);
    expect(onCommit).toHaveBeenCalledWith("=A2,2.5");
  });
  it("Esc reverts to the localized text", () => {
    const { bar, fx } = mk();
    bar.setCell("A1", "=MAX(1.5,2)"); fx.value = "typing";
    fx.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    expect(fx.value).toBe("=MAX(1,5;2)");
  });
});
