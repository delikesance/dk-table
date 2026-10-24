// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { createFormulaBar } from "./formulabar";

/**
 * Formula bar: shows the raw content of the active cell, edit + Enter commits,
 * Esc reverts, name box shows/jumps, and setCell (selection sync) overwrites.
 */
function mk() {
  const host = document.createElement("div");
  const o = { onGoto: vi.fn(), onCommit: vi.fn() };
  const bar = createFormulaBar(host, o);
  const name = host.querySelector<HTMLInputElement>(".dk-formula__name")!;
  const fx = host.querySelector<HTMLInputElement>(".dk-formula__input")!;
  return { host, o, bar, name, fx };
}
const key = (el: HTMLElement, k: string) =>
  el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));

describe("formula bar", () => {
  it("mounts in host with name box, fx label and input", () => {
    const { host, bar } = mk();
    expect(host.contains(bar.el)).toBe(true);
    expect(host.querySelector(".dk-formula__fx")?.textContent).toBe("fx");
  });
  it("shows raw formula (not the display value) and cell name", () => {
    const { bar, name, fx } = mk();
    bar.setCell("C7", "=SUM(A1:A3)");
    expect(name.value).toBe("C7"); expect(fx.value).toBe("=SUM(A1:A3)");
  });
  it("selection change replaces both fields and drops pending edits", () => {
    const { bar, name, fx } = mk();
    bar.setCell("A1", "1"); fx.value = "typing";
    bar.setCell("B2", "hello");
    expect(name.value).toBe("B2"); expect(fx.value).toBe("hello");
  });
  it("edit + Enter commits the typed text and prevents default", () => {
    const { bar, o, fx } = mk();
    bar.setCell("A1", "1"); fx.value = "=A2*2";
    const ev = new KeyboardEvent("keydown", { key: "Enter", cancelable: true });
    fx.dispatchEvent(ev);
    expect(o.onCommit).toHaveBeenCalledWith("=A2*2");
    expect(ev.defaultPrevented).toBe(true);
  });
  it("Esc reverts to the cell raw without committing", () => {
    const { bar, o, fx } = mk();
    bar.setCell("A1", "orig"); fx.value = "changed"; key(fx, "Escape");
    expect(fx.value).toBe("orig"); expect(o.onCommit).not.toHaveBeenCalled();
  });
  it("commit of empty text is allowed (clears the cell)", () => {
    const { bar, o, fx } = mk();
    bar.setCell("A1", "x"); fx.value = ""; key(fx, "Enter");
    expect(o.onCommit).toHaveBeenCalledWith("");
  });
  it("other keys do not commit", () => {
    const { bar, o, fx } = mk();
    bar.setCell("A1", "x"); key(fx, "a"); key(fx, "Tab");
    expect(o.onCommit).not.toHaveBeenCalled();
  });
  it("name box Enter goes to cell/range, uppercased and trimmed", () => {
    const { bar, o, name } = mk();
    bar.setCell("A1", "");
    name.value = " b2 "; key(name, "Enter");
    expect(o.onGoto).toHaveBeenCalledWith("B2");
    name.value = "a1:c3"; key(name, "Enter");
    expect(o.onGoto).toHaveBeenLastCalledWith("A1:C3");
  });
  it("name box rejects invalid refs and reverts", () => {
    const { bar, o, name } = mk();
    bar.setCell("D4", "");
    for (const bad of ["A0", "1A", "A1:", "foo bar", ""]) {
      name.value = bad; key(name, "Enter");
      expect(name.value, bad).toBe("D4");
    }
    expect(o.onGoto).not.toHaveBeenCalled();
  });
  it("focus() focuses the fx input", () => {
    const { host, bar, fx } = mk();
    document.body.append(host);
    bar.focus();
    expect(document.activeElement).toBe(fx);
    host.remove();
  });
});
