// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { attachFnComplete } from "./fnPopup";
import type { FnDoc } from "../sidebar/sidebar";

/** Function popup on a text field: list while typing a name after "=", keyboard choice, signature hint inside a call. */
const DOCS: FnDoc[] = [
  { name: "SUM", signature: "SUM(A1:A5)", description: "Somme des nombres" },
  { name: "SUMIF", signature: "SUMIF(plage; critère; [somme])", description: "Somme conditionnelle" },
  { name: "SQRT", signature: "SQRT(x)", description: "Racine carrée" },
];
let input: HTMLInputElement;
let editorKey: ReturnType<typeof vi.fn<(e: Event) => void>>;
const pop = () => document.querySelector<HTMLElement>(".dk-fnpop");
const names = () => [...document.querySelectorAll(".dk-fnpop__name")].map((e) => e.textContent);
const selected = () => document.querySelector(".dk-fnpop__item--selected .dk-fnpop__name")?.textContent;
const type = (v: string) => { input.value = v; input.setSelectionRange(v.length, v.length); input.dispatchEvent(new Event("input")); };
const key = (k: string) => input.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));

beforeEach(() => {
  document.body.replaceChildren();
  input = document.createElement("input");
  document.body.append(input);
  attachFnComplete(input, DOCS);
  editorKey = vi.fn<(e: Event) => void>();
  input.addEventListener("keydown", editorKey); // the editor's own handler, registered after
});

describe("function popup", () => {
  it("opens on = and filters as you type, with description and selected signature", () => {
    type("=");
    expect(names()).toEqual(["SQRT", "SUM", "SUMIF"]);
    type("=su");
    expect(names()).toEqual(["SUM", "SUMIF"]);
    expect(pop()?.textContent).toContain("Somme des nombres");
    expect(pop()?.querySelector(".dk-fnpop__sig")?.textContent).toBe("SUM(A1:A5)");
    expect(pop()?.getAttribute("role")).toBe("listbox");
  });
  it("stays closed for plain text and closes when nothing matches", () => {
    type("su");
    expect(pop()?.hidden ?? true).toBe(true);
    type("=sux");
    expect(pop()?.hidden ?? true).toBe(true);
  });
  it("moves the selection with arrows (wrapping) without reaching the editor", () => {
    type("=su");
    key("ArrowDown");
    expect(selected()).toBe("SUMIF");
    key("ArrowDown");
    expect(selected()).toBe("SUM");
    key("ArrowUp");
    expect(selected()).toBe("SUMIF");
    expect(editorKey).not.toHaveBeenCalled();
  });
  it("Enter / Tab insert NAME( at the word, caret after (, then shows the hint", () => {
    type("=1+su");
    key("ArrowDown");
    key("Enter");
    expect(input.value).toBe("=1+SUMIF(");
    expect(input.selectionStart).toBe(9);
    expect(editorKey).not.toHaveBeenCalled();
    expect(pop()!.classList.contains("dk-fnpop--hint")).toBe(true);
    expect(pop()!.querySelector(".dk-fnpop__arg--on")?.textContent).toBe("plage");
    type("=sq");
    key("Tab");
    expect(input.value).toBe("=SQRT(");
  });
  it("hint follows the argument under the caret and lets keys through", () => {
    type("=SUMIF(A1:A3; ");
    expect(pop()!.querySelector(".dk-fnpop__arg--on")?.textContent).toBe("critère");
    key("Enter");
    expect(editorKey).toHaveBeenCalledTimes(1);
  });
  it("Escape closes the list only; the next Escape reaches the editor", () => {
    type("=su");
    key("Escape");
    expect(pop()!.hidden).toBe(true);
    expect(editorKey).not.toHaveBeenCalled();
    key("Escape");
    expect(editorKey).toHaveBeenCalledTimes(1);
  });
  it("mouse: mousedown keeps focus (no blur commit) and click inserts", () => {
    type("=su");
    const item = document.querySelectorAll<HTMLElement>(".dk-fnpop__item")[1];
    const down = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
    item.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
    expect(input.value).toBe("=SUMIF(");
  });
  it("hides on blur and is removed by destroy", () => {
    const h = attachFnComplete(input, DOCS);
    type("=s");
    const n = document.querySelectorAll(".dk-fnpop").length;
    input.dispatchEvent(new Event("blur"));
    expect([...document.querySelectorAll<HTMLElement>(".dk-fnpop")].every((p) => p.hidden)).toBe(true);
    h.destroy();
    expect(document.querySelectorAll(".dk-fnpop").length).toBe(n - 1);
  });
});
