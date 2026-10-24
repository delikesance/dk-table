/** Border modes -> per-cell edges (pure). */
import { describe, expect, it } from "vitest";
import { borderEdges } from "./borders";

const keys = ["A1", "B1", "A2", "B2"];
const none = () => undefined;

describe("borderEdges", () => {
  it("all: every edge of every cell", () => {
    const out = borderEdges("all", keys, none);
    for (const k of keys) expect(out[k]).toEqual({ t: true, r: true, b: true, l: true });
  });
  it("outer: only the outside edges of the rectangle", () => {
    const out = borderEdges("outer", keys, none);
    expect(out.A1).toEqual({ t: true, l: true });
    expect(out.B1).toEqual({ t: true, r: true });
    expect(out.A2).toEqual({ b: true, l: true });
    expect(out.B2).toEqual({ b: true, r: true });
  });
  it("outer on a single cell draws its four edges", () => {
    expect(borderEdges("outer", ["C3"], none).C3).toEqual({ t: true, r: true, b: true, l: true });
  });
  it("bottom: bottom edge of the last row only, merged with existing edges", () => {
    const out = borderEdges("bottom", keys, (k) => (k === "A2" ? { t: true } : undefined));
    expect(out.A2).toEqual({ t: true, b: true });
    expect(out.B2).toEqual({ b: true });
    expect("A1" in out).toBe(false);
  });
  it("none: clears every selected cell", () => {
    const out = borderEdges("none", keys, () => ({ t: true }));
    for (const k of keys) { expect(k in out).toBe(true); expect(out[k]).toBeUndefined(); }
  });
});
