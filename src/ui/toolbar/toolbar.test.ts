// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { createToolbar, createFormulaBar } from "./index";

/** Builds a toolbar with spy handlers. */
function mkToolbar() {
  const host = document.createElement("div");
  const h = {
    onUndo: vi.fn(), onRedo: vi.fn(), onBold: vi.fn(), onItalic: vi.fn(),
    onAlign: vi.fn(), onFormat: vi.fn(), onFill: vi.fn(), onTextColor: vi.fn(),
  };
  const tb = createToolbar(host, h);
  return { host, h, tb };
}
const btn = (host: HTMLElement, a: string) => host.querySelector<HTMLButtonElement>(`[data-action="${a}"]`)!;

describe("toolbar", () => {
  it("emits actions on click", () => {
    const { host, h } = mkToolbar();
    btn(host, "undo").click(); btn(host, "redo").click();
    btn(host, "bold").click(); btn(host, "italic").click();
    btn(host, "align-center").click();
    expect(h.onUndo).toHaveBeenCalled(); expect(h.onRedo).toHaveBeenCalled();
    expect(h.onBold).toHaveBeenCalled(); expect(h.onItalic).toHaveBeenCalled();
    expect(h.onAlign).toHaveBeenCalledWith("center");
  });
  it("no duplicate of the menu bar: no open/save buttons, no File menu", () => {
    const { host } = mkToolbar();
    expect(btn(host, "open")).toBeNull();
    expect(btn(host, "save")).toBeNull();
    expect(host.querySelector(".dk-menu__trigger")).toBeNull();
  });
  it("emits format and fill colour", () => {
    const { host, h } = mkToolbar();
    const sel = host.querySelector<HTMLSelectElement>("select")!;
    sel.value = sel.options[1].value; sel.dispatchEvent(new Event("change"));
    expect(h.onFormat).toHaveBeenCalledWith(sel.options[1].value);
  });
  it("fill button opens the colour picker; swatch emits colour, Aucune emits null", () => {
    const { host, h } = mkToolbar();
    const pop = host.querySelector<HTMLElement>(".color-picker")!;
    expect(pop.hidden).toBe(true);
    btn(host, "fill").click();
    expect(pop.hidden).toBe(false);
    pop.querySelector<HTMLButtonElement>(".color-swatch")!.click();
    expect(h.onFill).toHaveBeenCalledWith("#fde2e0");
    expect(pop.hidden).toBe(true);
    btn(host, "fill").click();
    pop.querySelector<HTMLButtonElement>('[aria-label="Aucune"]')!.click();
    expect(h.onFill).toHaveBeenLastCalledWith(null);
  });
  it("text colour button is enabled; swatch emits colour, Aucune emits null", () => {
    const { host, h } = mkToolbar();
    const t = btn(host, "text-color");
    expect(t.disabled).toBe(false); expect(t.hidden).toBe(false);
    const pop = host.querySelectorAll<HTMLElement>(".color-picker")[1];
    expect(pop.hidden).toBe(true);
    t.click();
    expect(pop.hidden).toBe(false);
    pop.querySelector<HTMLButtonElement>(".color-swatch")!.click();
    expect(h.onTextColor).toHaveBeenCalledWith("#1d1d1f");
    expect(pop.hidden).toBe(true);
    t.click();
    pop.querySelector<HTMLButtonElement>('[aria-label="Aucune"]')!.click();
    expect(h.onTextColor).toHaveBeenLastCalledWith(null);
  });
  it("choosing percent emits onFormat('percent')", () => {
    const { host, h } = mkToolbar();
    const sel = host.querySelector<HTMLSelectElement>("select")!;
    sel.value = "percent"; sel.dispatchEvent(new Event("change"));
    expect(h.onFormat).toHaveBeenCalledWith("percent");
  });
  it("choosing Date emits onFormat('date') and the option is offered", () => {
    const { host, h } = mkToolbar();
    const sel = host.querySelector<HTMLSelectElement>("select")!;
    expect([...sel.options].map((o) => o.value)).toContain("date");
    sel.value = "date"; sel.dispatchEvent(new Event("change"));
    expect(h.onFormat).toHaveBeenCalledWith("date");
  });
  it("setState updates pressed/disabled/selected", () => {
    const { host, tb } = mkToolbar();
    tb.setState({ bold: true, italic: false, align: "right", format: "percent", canUndo: false, canRedo: true });
    expect(btn(host, "bold").getAttribute("aria-pressed")).toBe("true");
    expect(btn(host, "bold").classList.contains("dk-iconbtn--active")).toBe(true);
    expect(btn(host, "italic").getAttribute("aria-pressed")).toBe("false");
    expect(btn(host, "align-right").getAttribute("aria-pressed")).toBe("true");
    expect(btn(host, "undo").disabled).toBe(true);
    expect(btn(host, "redo").disabled).toBe(false);
    expect(host.querySelector("select")!.value).toBe("percent");
  });
  it("buttons are labelled", () => {
    const { host } = mkToolbar();
    host.querySelectorAll("button").forEach((b) => expect(b.getAttribute("aria-label")).toBeTruthy());
  });
});

/** Builds a formula bar with spy callbacks. */
function mkBar() {
  const host = document.createElement("div");
  const o = { onGoto: vi.fn(), onCommit: vi.fn() };
  const bar = createFormulaBar(host, o);
  const name = host.querySelector<HTMLInputElement>(".dk-formula__name")!;
  const fx = host.querySelector<HTMLInputElement>(".dk-formula__input")!;
  return { host, o, bar, name, fx };
}
const key = (el: HTMLElement, k: string) => el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true }));

describe("formula bar", () => {
  it("setCell shows key and raw", () => {
    const { bar, name, fx } = mkBar();
    bar.setCell("B2", "=A1+1");
    expect(name.value).toBe("B2"); expect(fx.value).toBe("=A1+1");
  });
  it("Enter in fx commits, Esc reverts", () => {
    const { bar, o, fx } = mkBar();
    bar.setCell("A1", "5");
    fx.value = "7"; key(fx, "Enter");
    expect(o.onCommit).toHaveBeenCalledWith("7");
    fx.value = "9"; key(fx, "Escape");
    expect(fx.value).toBe("7"); expect(o.onCommit).toHaveBeenCalledTimes(1);
  });
  it("name box jumps on Enter (uppercased), Esc reverts", () => {
    const { bar, o, name } = mkBar();
    bar.setCell("A1", "");
    name.value = "c3:d4"; key(name, "Enter");
    expect(o.onGoto).toHaveBeenCalledWith("C3:D4");
    name.value = "zz"; key(name, "Escape");
    expect(name.value).toBe("A1");
  });
  it("ignores invalid names", () => {
    const { bar, o, name } = mkBar();
    bar.setCell("A1", "");
    name.value = "hello!"; key(name, "Enter");
    expect(o.onGoto).not.toHaveBeenCalled();
    expect(name.value).toBe("A1");
  });
});
