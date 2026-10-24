// @ts-ignore @types/node absent
import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

const css = (readFileSync as (p: string, e: string) => string)("src/ui/grid/grid.css", "utf8");
/** Body of the first rule whose selector list is exactly `sel`. */
const rule = (sel: string): string => {
  const m = css.match(new RegExp(`(?:^|\\})\\s*${sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`, "m"));
  return m ? m[1] : "";
};

describe("grid.css", () => {
  it("numbers right-aligned via flex-end", () => expect(rule(".dkg-num")).toMatch(/justify-content:\s*flex-end/));
  it("errors: red text, tinted bg, semibold", () => {
    const r = rule(".dkg-err");
    expect(r).toMatch(/color:\s*var\(--c-error\)/);
    expect(r).toMatch(/background:\s*var\(--c-error-soft\)/);
    expect(r).toMatch(/font-weight:\s*var\(--fw-semibold\)/);
  });
  it("active cell has an accent notch", () => {
    const r = rule(".dkg-active::after");
    expect(r).toMatch(/width:\s*var\(--notch\)/);
    expect(r).toMatch(/background:\s*var\(--c-accent\)/);
  });
  it("range fill uses accent-soft", () => expect(rule(".dkg-range")).toMatch(/--c-accent-soft/));
  it("headers medium weight, text-2", () => {
    const r = rule(".dkg-corner, .dkg-colh, .dkg-rowh");
    expect(r).toMatch(/--fw-medium/);
    expect(r).toMatch(/--c-text-2/);
  });
  it("headers set in the mono face (DM Mono), like the Hermes labels", () => {
    expect(rule(".dkg-corner, .dkg-colh, .dkg-rowh")).toMatch(/font-family:\s*var\(--font-mono\)/);
  });
  it("column header edge uses strong line", () => expect(rule(".dkg-colh")).toMatch(/--c-line-strong/));
  it("frozen cells are sticky and opaque", () => {
    const r = rule(".dkg-frozen");
    expect(r).toMatch(/position:\s*sticky/);
    expect(r).toMatch(/background:\s*var\(--c-surface\)/);
  });
  it("frozen separators use the strong line", () => {
    expect(rule(".dkg-frozen-b")).toMatch(/border-bottom-color:\s*var\(--c-line-strong\)/);
    expect(rule(".dkg-frozen-r")).toMatch(/border-right-color:\s*var\(--c-line-strong\)/);
  });
});
