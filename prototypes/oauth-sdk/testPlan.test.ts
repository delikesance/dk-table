/** Choix des tests d'une carte: documentation seule, tests lies (test modifie inclus), repli complet dans le doute. */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { planTests } from "./testPlan";

describe("planTests", () => {
  it("un fichier de test modifie est inclus dans la selection (avec le code modifie)", () => {
    expect(planTests(["src/engine/sort.ts", "src/engine/sort.test.ts"])).toEqual({ mode: "related", files: ["src/engine/sort.ts", "src/engine/sort.test.ts"] });
    expect(planTests(["src/engine/sort.test.ts"])).toEqual({ mode: "related", files: ["src/engine/sort.test.ts"] });
  });
  it("documentation, TODO, captures et rapports seuls: aucune verification", () => {
    expect(planTests(["docs/rapports/a.md", "TODO.md", "docs/screenshots/a/clair.png", "CLAUDE.md"])).toEqual({ mode: "none" });
  });
  it("les fichiers de documentation sont retires de la selection quand du code change", () => {
    expect(planTests(["src/a.ts", "docs/rapports/a.md"])).toEqual({ mode: "related", files: ["src/a.ts"] });
  });
  it("repli suite complete: configuration, liste vide, hors vitest, ligne trop longue", () => {
    for (const c of ["package.json", "package-lock.json", "tsconfig.json", "vite.config.ts", "src/test-setup.ts", ".github/workflows/ci.yml"]) {
      expect(planTests(["src/a.ts", c]).mode, c).toBe("full");
    }
    expect(planTests([]).mode).toBe("full");
    expect(planTests(["src-tauri/src/lib.rs"]).mode).toBe("full");
    expect(planTests(Array.from({ length: 400 }, (_, i) => `src/modules/tres-long-nom-de-module-${i}.ts`)).mode).toBe("full");
  });
  it("chemins Windows et doublons normalises", () => {
    expect(planTests(["src\\a.ts", "src/a.ts"])).toEqual({ mode: "related", files: ["src/a.ts"] });
  });
});

describe("vitest related (vrai processus)", () => {
  // garde contre la recursion: le processus lance relance ce meme fichier, avec ce test saute
  it.skipIf(!!process.env.BOUCLE_NESTED)("un fichier de test modifie est bien execute par `vitest related` (selection reelle)", () => {
    const out = join(mkdtempSync(join(tmpdir(), "rel-")), "out.json");
    spawnSync("npx", ["vitest", "related", "--run", "prototypes/oauth-sdk/testPlan.test.ts", "--reporter=json", `--outputFile=${out}`], { encoding: "utf8", shell: process.platform === "win32", env: { ...process.env, BOUCLE_NESTED: "1" } });
    const json = JSON.parse(readFileSync(out, "utf8"));
    expect(json.testResults.map((x: { name: string }) => x.name.replace(/\\/g, "/")).some((n: string) => n.endsWith("prototypes/oauth-sdk/testPlan.test.ts"))).toBe(true);
    expect(json.numFailedTests).toBe(0);
  }, 180_000);
});
