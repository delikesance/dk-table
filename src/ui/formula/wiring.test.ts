// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createGrid } from "../grid/grid";
import { createFormulaBar } from "../toolbar/formulabar";

/** The function popup is wired on the cell editor and on the formula bar, and takes its keys before them. */
const key = (el: Element, k: string) => el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));
const type = (i: HTMLInputElement | HTMLTextAreaElement, v: string) => {
  i.value = v; i.setSelectionRange(v.length, v.length); i.dispatchEvent(new Event("input"));
};
const pop = () => document.querySelector<HTMLElement>(".dk-fnpop");
const visible = () => !!pop() && !pop()!.hidden;

beforeEach(() => document.body.replaceChildren());

describe("cell editor", () => {
  function mount() {
    const host = document.createElement("div");
    document.body.append(host);
    const onEdit = vi.fn();
    createGrid(host, { cols: 5, rows: 5, getDisplay: () => "", getRaw: () => "", onEdit });
    const root = host.querySelector<HTMLElement>(".dkg")!;
    const input = () => host.querySelector<HTMLTextAreaElement>(".dkg-editor");
    return { root, input, onEdit };
  }
  it("typing = opens the list; Enter inserts the function without committing", () => {
    const { root, input, onEdit } = mount();
    key(root, "=");
    expect(visible()).toBe(true);
    type(input()!, "=sum");
    key(input()!, "Enter");
    expect(input()!.value).toBe("=SUM(");
    expect(onEdit).not.toHaveBeenCalled();
  });
  it("Enter in the hint commits as usual and the popup goes away", () => {
    const { root, input, onEdit } = mount();
    key(root, "=");
    type(input()!, "=SUM(A1");
    key(input()!, "Enter");
    expect(onEdit).toHaveBeenCalledWith("A1", "=SUM(A1");
    expect(pop()).toBeNull();
  });
  it("first Escape closes the list, the second cancels the edit", () => {
    const { root, input, onEdit } = mount();
    key(root, "=");
    key(input()!, "Escape");
    expect(input()).not.toBeNull();
    key(input()!, "Escape");
    expect(input()).toBeNull();
    expect(onEdit).not.toHaveBeenCalled();
    expect(pop()).toBeNull();
  });
});

describe("formula bar", () => {
  it("lists functions in fx and Enter inserts instead of committing", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const onCommit = vi.fn();
    createFormulaBar(host, { onGoto: vi.fn(), onCommit });
    const fx = host.querySelector<HTMLInputElement>(".dk-formula__input")!;
    fx.focus();
    type(fx, "=ro");
    expect(visible()).toBe(true);
    key(fx, "Enter");
    expect(fx.value).toBe("=ROUND(");
    expect(onCommit).not.toHaveBeenCalled();
    key(fx, "Enter");
    expect(onCommit).toHaveBeenCalledWith("=ROUND(");
  });
});
