// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { mount } from "./app";

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  mount(document.getElementById("app")!);
});

describe("Ctrl+J in text fields", () => {
  it("is ignored while the focus is in an input, works elsewhere", () => {
    const tools = document.querySelector<HTMLElement>(".dk-toolbar__n2")!;
    const before = tools.hidden;
    const input = document.querySelector<HTMLInputElement>(".dk-formula input")!;
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "j", ctrlKey: true, bubbles: true, cancelable: true }));
    expect(tools.hidden).toBe(before);
    document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "j", ctrlKey: true, bubbles: true, cancelable: true }));
    expect(tools.hidden).toBe(!before);
  });
});
