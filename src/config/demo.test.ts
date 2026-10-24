import { describe, expect, it } from "vitest";
import demo from "../../docs/demo.md?raw";
import functionsSrc from "../engine/functions.ts?raw";
import adapterSrc from "../engine/live/adapter.ts?raw";
import evaluatorSrc from "../engine/evaluator.ts?raw";

/** Demo script (docs/demo.md): size, sections, and cited functions must exist in the engine. */
const engineFns = new Set<string>([
  ...[...functionsSrc.matchAll(/def\("([A-Z]+)"/g)].map((m) => m[1]),
  ...[...adapterSrc.matchAll(/registerFunction\("([A-Z]+)"/g)].map((m) => m[1]),
  ...(evaluatorSrc.includes('n.name === "IF"') ? ["IF"] : []),
]);

describe("docs/demo.md", () => {
  it("stays within 200 lines", () => {
    expect(demo.split("\n").length).toBeLessThanOrEqual(200);
  });

  it.each(["Installation", "Tour", "Pièges", "Checklist"])("has section %s", (s) => {
    expect(demo).toMatch(new RegExp(`^##\\s+.*${s}`, "m"));
  });

  it("cites core features", () => {
    for (const k of ["Ctrl+J", "Ctrl+K", "#CYCLE!", ".dktable", "CSV", "MSI", "NSIS", "deb", "AppImage"]) {
      expect(demo).toContain(k);
    }
  });

  it("every cited function exists in the engine", () => {
    const cited = new Set([...demo.matchAll(/=\s*([A-Z]{2,})\(/g)].map((m) => m[1]));
    expect(cited.size).toBeGreaterThan(3);
    for (const f of cited) expect(engineFns, f).toContain(f);
    for (const f of ["SPARKLINE", "BAR", "TREND", "SUM"]) expect(cited).toContain(f);
  });
});
