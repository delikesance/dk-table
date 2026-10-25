// @vitest-environment node
/** Coherence de docs/boucle-optimisee.md avec le code : constantes, modules cites, valeurs obsoletes. */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import * as limits from "./limits";

const here = dirname(fileURLToPath(import.meta.url));
const doc = readFileSync(join(here, "../../docs/boucle-optimisee.md"), "utf8");

describe("docs/boucle-optimisee.md", () => {
  it("le bloc de constantes est identique a limits.ts", () => {
    const block = /<!-- boucle-constantes\n([\s\S]*?)-->/.exec(doc)?.[1] ?? "";
    const docVals = Object.fromEntries(block.split("\n").filter(Boolean).map((l) => l.split("=")).map(([k, v]) => [k, Number(v)]));
    expect(docVals).toEqual({ ...limits });
  });
  it("chaque module `x.ts` cite existe dans le prototype", () => {
    const names = [...doc.matchAll(/`([\w.-]+\.ts)`/g)].map((m) => m[1]);
    const missing = [...new Set(names)].filter((n) => !existsSync(join(here, n)) && !existsSync(join(here, "../../src", n)));
    expect(missing).toEqual([]);
  });
  it("aucune valeur ni nom obsolete ne reste", () => {
    for (const old of ["MODEL_BY_KIND", "lot de 3 cartes", "12 tournées ou 2", "pas d'agents en parallèle"]) expect(doc).not.toContain(old);
  });
});
