// @ts-ignore @types/node absent
import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

const rd = (p: string): string => (readFileSync as (p: string, e: string) => string)(p, "utf8");
/** Review token deltas must hold in both the app tokens and the design mockup tokens. */
for (const file of ["src/styles/tokens.css", "mockups/design/tokens.css"]) {
  const [lightPart, darkPart] = rd(file).split("prefers-color-scheme: dark");
  describe(file, () => {
    it("line .14 light / .16 dark", () => {
      expect(lightPart).toMatch(/--c-line:\s*rgba\(0, 0, 0, 0\.14\)/);
      expect(darkPart).toMatch(/--c-line:\s*rgba\(255, 255, 255, 0\.16\)/);
    });
    it("accent-soft .14 light", () => expect(lightPart).toMatch(/--c-accent-soft:\s*rgba\(59, 79, 216, 0\.14\)/));
    it("radii 8/12", () => {
      expect(lightPart).toMatch(/--r-md:\s*8px/);
      expect(lightPart).toMatch(/--r-lg:\s*12px/);
    });
    it("sh-2 deeper", () => expect(lightPart).toMatch(/--sh-2:\s*0 6px 20px rgba\(0, 0, 0, 0\.14\)/));
    it("cell font 13.5", () => expect(lightPart).toMatch(/--fs-md:\s*13\.5px/));
  });
}
