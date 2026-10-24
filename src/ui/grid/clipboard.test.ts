// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { toTsv, fromTsv, pasteMatrix, bindClipboard } from "./clipboard";
import type { Pos } from "./keys";

describe("tsv", () => {
  it("encodes a matrix", () => {
    expect(toTsv([["a", "b"], ["c", "d"]])).toBe("a\tb\nc\td");
  });
  it("decodes, handling CRLF and trailing newline", () => {
    expect(fromTsv("a\tb\r\nc\td\r\n")).toEqual([["a", "b"], ["c", "d"]]);
  });
});

describe("pasteMatrix", () => {
  it("shifts formulas copied inside the app by the paste offset", () => {
    const text = "=A1+$B$1\t2";
    expect(pasteMatrix(text, { col: 2, row: 3 }, { text, origin: { col: 1, row: 0 } }))
      .toEqual([["=B4+$B$1", "2"]]);
  });
  it("external text (not the last internal copy) is pasted verbatim", () => {
    expect(pasteMatrix("=A1", { col: 2, row: 3 }, { text: "other", origin: { col: 0, row: 0 } })).toEqual([["=A1"]]);
    expect(pasteMatrix("=A1", { col: 2, row: 3 }, null)).toEqual([["=A1"]]);
  });
});

/** Fire a clipboard-like event carrying a fake DataTransfer. */
function fire(root: HTMLElement, type: string, data: Map<string, string>): void {
  const e = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(e, "clipboardData", {
    value: { setData: (t: string, v: string) => data.set(t, v), getData: (t: string) => data.get(t) ?? "" },
  });
  root.dispatchEvent(e);
}

describe("bindClipboard", () => {
  const setup = (raw: Record<string, string>) => {
    const root = document.createElement("div");
    let sel: { anchor: Pos; active: Pos } = { anchor: { col: 0, row: 0 }, active: { col: 0, row: 0 } };
    const put = vi.fn();
    bindClipboard(root, {
      sel: () => sel, cols: 10, rows: 10, busy: () => false,
      getRaw: (k) => raw[k] ?? "", put, clear: vi.fn(),
    });
    return { root, put, select: (p: Pos) => { sel = { anchor: p, active: p }; } };
  };
  it("copy then paste inside the app shifts relative refs", () => {
    const { root, put, select } = setup({ B2: "=A1*2" });
    const data = new Map<string, string>();
    select({ col: 1, row: 1 });
    fire(root, "copy", data);
    select({ col: 2, row: 4 });
    fire(root, "paste", data);
    expect(put).toHaveBeenCalledWith("C5", "=B4*2");
  });
  it("cut then paste keeps the formula text", () => {
    const { root, put, select } = setup({ B2: "=A1*2" });
    const data = new Map<string, string>();
    select({ col: 1, row: 1 });
    fire(root, "cut", data);
    select({ col: 2, row: 4 });
    fire(root, "paste", data);
    expect(put).toHaveBeenCalledWith("C5", "=A1*2");
  });
});
