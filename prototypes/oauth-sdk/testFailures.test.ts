/** Lecture des tests rouges d'une sortie vitest (avec ANSI, CRLF, noms longs) et comparaison avec la base. */
import { describe, expect, it } from "vitest";
import { failedFiles, failedTests, onlyOnBranch } from "./testFailures";

const OUT = [
  " \u001b[41m FAIL \u001b[49m prototypes/oauth-sdk/git.push.test.ts > pushDev > distant en avance (push rejete): integre le distant",
  "Error: Test timed out in 5000ms.",
  " FAIL  src/engine/sheet.test.ts > setCell > recalcule les dependants",
  "AssertionError: expected 1 to be 2",
  " FAIL  src/ui/boom.test.ts",
  "Error: Cannot find module './x'",
  " Test Files  3 failed | 264 passed (267)",
].join("\r\n");

describe("failedTests", () => {
  it("un identifiant par test rouge (fichier > noms), sans ANSI, sans doublon", () => {
    expect(failedTests(OUT + "\n" + OUT)).toEqual([
      "prototypes/oauth-sdk/git.push.test.ts > pushDev > distant en avance (push rejete): integre le distant",
      "src/engine/sheet.test.ts > setCell > recalcule les dependants",
      "src/ui/boom.test.ts",
    ]);
  });
  it("sortie sans ligne FAIL (crash, tsc): liste vide", () => { expect(failedTests("Segmentation fault")).toEqual([]); });
  it("fichiers concernes, uniques", () => {
    expect(failedFiles(failedTests(OUT))).toEqual(["prototypes/oauth-sdk/git.push.test.ts", "src/engine/sheet.test.ts", "src/ui/boom.test.ts"]);
  });
});

describe("onlyOnBranch", () => {
  it("echecs de la branche absents de la base = introduits par la branche", () => {
    expect(onlyOnBranch(["a > x", "b > y"], ["a > x"])).toEqual(["b > y"]);
  });
  it("tout echoue deja sur la base: rien d'introduit", () => { expect(onlyOnBranch(["a > x"], ["a > x", "c"])).toEqual([]); });
});

describe("testCount", () => {
  it("lit le nombre de tests passes, avec ou sans echecs et codes ANSI", async () => {
    const { testCount } = await import("./testFailures");
    expect(testCount("\u001b[2m Tests \u001b[22m 458 passed | 4 skipped (462)")).toBe(458);
    expect(testCount(" Tests  3 failed | 12 passed (15)")).toBe(12);
    expect(testCount("rien")).toBeUndefined();
  });
});
