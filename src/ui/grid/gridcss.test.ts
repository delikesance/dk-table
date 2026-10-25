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
  it("fill handle (bottom-right corner of the selection) has an accent notch", () => {
    const r = rule(".dkg-h::after");
    expect(r).toMatch(/width:\s*var\(--notch\)/);
    expect(r).toMatch(/background:\s*var\(--c-accent\)/);
  });
  it("range edges draw a 1.5px accent outline, active cell a full ring", () => {
    expect(rule(".dkg-e-t")).toMatch(/--e-t/);
    expect(rule(".dkg-range")).toMatch(/box-shadow:[^;]*var\(--c-accent\)/);
    expect(rule(".dkg-active")).toMatch(/--cursor-w/);
  });
  it("selected headers: soft fill, accent edge toward the grid, active one stronger", () => {
    expect(rule(".dkg-colh.dkg-on, .dkg-rowh.dkg-on")).toMatch(/--c-accent-soft/);
    expect(rule(".dkg-colh.dkg-on-active, .dkg-rowh.dkg-on-active")).toMatch(/--c-accent-soft-2/);
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
