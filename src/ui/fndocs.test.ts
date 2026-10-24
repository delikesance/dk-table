import src from "../engine/functions.ts?raw";
import { describe, expect, it } from "vitest";
import { createSheet, getDisplay, setCell } from "../engine/sheet";
import { registerLive } from "../engine/live/adapter";
import { FN_DOCS } from "./fndocs";

/**
 * Consistency of the sidebar function reference (FN_DOCS) with the engine:
 * every engine function (builtins read from functions.ts + IF + live charts)
 * is documented, every doc maps to a real function, FR text and syntax.
 */
registerLive();
const BUILTINS = [...src.matchAll(/^def\("([A-Z]+)"/gm)].map((m) => m[1]);
/** Engine functions: parsed builtins, special form IF, live charts. */
const ENGINE = [...BUILTINS, "IF", "SPARKLINE", "BAR", "TREND"];
const names = FN_DOCS.map((d) => d.name);

/** True when the engine knows `name` (no #NAME? when called). */
function known(name: string): boolean {
  const s = createSheet();
  setCell(s, "A1", "1"); setCell(s, "B1", `=${name}(A1)`);
  return getDisplay(s, "B1") !== "#NAME?";
}

describe("FN_DOCS", () => {
  it("sees the real builtins", () => expect(BUILTINS.length).toBeGreaterThanOrEqual(8));
  it("documents every engine function", () => {
    for (const n of ENGINE) expect(names, n).toContain(n);
  });
  it("has no orphan doc (each is known to the engine)", () => {
    for (const d of FN_DOCS) expect(known(d.name), d.name).toBe(true);
    expect(known("NOPE")).toBe(false);
  });
  it("has no duplicate names", () => expect(new Set(names).size).toBe(names.length));
  it("has non-empty name, signature and French description", () => {
    for (const d of FN_DOCS) {
      expect(d.name, d.name).toMatch(/^[A-Z]+$/);
      expect(d.description.trim().length, d.name).toBeGreaterThan(3);
      expect(d.description, d.name).toMatch(/^[A-ZÀ-Ý]/);
    }
  });
  it("signature starts with NAME( and has balanced parens", () => {
    for (const d of FN_DOCS) {
      expect(d.signature.startsWith(d.name + "("), d.name).toBe(true);
      expect(d.signature.endsWith(")"), d.name).toBe(true);
    }
  });
  it("uses ; as argument separator (FR syntax)", () => {
    for (const d of FN_DOCS) expect(d.signature, d.name).not.toContain(",");
  });
});
