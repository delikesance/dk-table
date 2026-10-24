import { describe, expect, it } from "vitest";
import doc from "../../docs/workflow-ux.md?raw";
/** Workflow UX doc: exists, stays within the 200-line rule, covers the required sections. */
describe("workflow ux doc", () => {
  it("exists and is not empty", () => {
    expect(doc.length).toBeGreaterThan(500);
  });

  it("stays within 200 lines", () => {
    expect(doc.split("\n").length).toBeLessThanOrEqual(200);
  });

  it("has the three levels N1/N2/N3", () => {
    for (const n of ["N1", "N2", "N3"]) expect(doc).toMatch(new RegExp(`^#{2,3} .*${n}`, "m"));
  });

  it("has benchmark, click table and change list sections", () => {
    expect(doc).toMatch(/^## .*[Bb]enchmark/m);
    expect(doc).toMatch(/^## .*clics/m);
    expect(doc).toMatch(/^## .*[Cc]hangements/m);
    expect(doc).toMatch(/^## .*[Dd]écisions/m);
  });

  it("click table has current and target columns", () => {
    expect(doc).toMatch(/\|\s*Tâche\s*\|\s*Actuel\s*\|\s*Cible\s*\|/);
  });
});
