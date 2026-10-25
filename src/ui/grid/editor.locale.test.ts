// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openEditor } from "./editor";

/** Inline editor in a French browser opens the stored formula in fr syntax. */
describe("inline editor, fr syntax", () => {
  beforeEach(() => Object.defineProperty(navigator, "language", { value: "fr-FR", configurable: true }));
  afterEach(() => { delete (navigator as { language?: string }).language; });

  it("opens a stored formula with ';' and ','", () => {
    const el = document.createElement("div");
    const h = { end: () => {}, move: () => {}, commitAll: () => {} };
    const ed = openEditor(el, "=SUM(A1,2.5)", false, h);
    expect(ed.input.value).toBe("=SUM(A1;2,5)");
  });
});
