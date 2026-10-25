/** Tests du nettoyage de la sortie des commandes (codes ANSI, resume d'echec de tests). */
import { describe, expect, it } from "vitest";
import { failureDigest, stripAnsi } from "./cleanOutput";

const ESC = String.fromCharCode(27);

describe("stripAnsi", () => {
  it("retire les sequences de couleur et de curseur", () => {
    expect(stripAnsi(`${ESC}[2m | ${ESC}[22m${ESC}[1m${ESC}[32m1833 passed${ESC}[39m${ESC}[0m`)).toBe(" | 1833 passed");
    expect(stripAnsi("ok")).toBe("ok");
  });
});

describe("failureDigest", () => {
  const noise = Array.from({ length: 80 }, (_, i) => `ligne de bruit ${i}`).join("\n");
  it("garde les lignes FAIL/Error et le bilan meme loin de la fin, sans ANSI", () => {
    const out = `${ESC}[31m FAIL ${ESC}[39m src/a.test.ts > cas > rouge\nAssertionError: attendu 1\n${noise}\n Tests  1 failed | 1833 passed (1835)\n Duration 26s`;
    const d = failureDigest(out);
    expect(d).toContain("FAIL  src/a.test.ts > cas > rouge");
    expect(d).toContain("AssertionError: attendu 1");
    expect(d).toContain("Tests  1 failed | 1833 passed (1835)");
    expect(d).not.toContain(ESC);
    expect(d).not.toContain("ligne de bruit 40");
  });
  it("sans motif connu: la fin de la sortie nettoyee", () => {
    expect(failureDigest(`${noise}\nfin`)).toMatch(/fin$/);
  });
  it("borne la taille", () => {
    expect(failureDigest("FAIL x\n".repeat(500)).length).toBeLessThanOrEqual(1500);
  });
});
