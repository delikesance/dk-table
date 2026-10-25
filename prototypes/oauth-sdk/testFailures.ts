/**
 * Tests rouges d'une sortie vitest : identifiants et comparaison avec la base.
 *
 * Quoi : `failedTests(sortie)` -> `fichier > describe > test` (ou `fichier` seul si le fichier ne charge pas), sans doublon;
 *        `failedFiles` -> fichiers concernes; `onlyOnBranch(branche, base)` -> echecs que la base n'a pas.
 * Pourquoi : un test deja rouge sur `developpement` (infrastructure, machine lente) ne doit pas bloquer la fusion d'une carte
 *        sans rapport; seuls les echecs introduits par la branche la bloquent (voir git.ts `mergeIfGreen`).
 * Usage : `onlyOnBranch(failedTests(sortieBranche), failedTests(sortieBase))`.
 */
import { stripAnsi } from "./cleanOutput";

const FAIL = /^\s*FAIL\s+(\S.*?)\s*$/;

/** Identifiants des tests rouges (ordre d'apparition, sans doublon). */
export function failedTests(out: string): string[] {
  const seen = new Set<string>();
  for (const line of stripAnsi(out).split(/\r?\n/)) {
    const m = FAIL.exec(line);
    if (m) seen.add(m[1]);
  }
  return [...seen];
}

/** Fichiers de tests concernes (partie avant ` > `), sans doublon. */
export const failedFiles = (tests: string[]): string[] => [...new Set(tests.map((t) => t.split(" > ")[0]))];

/** Echecs de la branche qui n'existent pas sur la base (un fichier entier rouge sur la base couvre ses tests). */
export function onlyOnBranch(branch: string[], base: string[]): string[] {
  const b = new Set(base);
  return branch.filter((t) => !b.has(t) && !b.has(t.split(" > ")[0]));
}

/** Nombre de tests passes lu dans le bilan vitest (`Tests  458 passed | 4 skipped (462)`); `undefined` si illisible. */
export function testCount(out: string): number | undefined {
  const m = /^\s*Tests\s+(?:\d+ failed \| )?(\d+) passed/m.exec(stripAnsi(out));
  return m ? Number(m[1]) : undefined;
}
