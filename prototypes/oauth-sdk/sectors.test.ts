/** Tests des secteurs implementation / correction / design (query factice, sans reseau ni cout). */
import { describe, expect, it } from "vitest";
import type { QueryFn } from "./research";
import { SECTORS, runSector } from "./sectors";

/** Query factice : enregistre les options, renvoie un resultat de cout `cost` (ou une erreur). */
function fake(cost: number, subtype = "success") {
  const seen: { prompt: string; options: Record<string, unknown> }[] = [];
  const q: QueryFn = (a) => {
    seen.push(a);
    return (async function* () {
      yield { type: "result", subtype, result: "fait", total_cost_usd: cost };
    })();
  };
  return { q, seen };
}

describe("SECTORS", () => {
  it("definit implementation, correction et design", () => {
    expect(SECTORS.map((s) => s.id)).toEqual(["implementation", "correction", "design"]);
  });

  it("chaque secteur: TDD/CLAUDE.md dans le prompt, dontAsk, git push et master interdits", () => {
    for (const s of SECTORS) {
      expect(s.prompt).toMatch(/CLAUDE\.md/);
      expect(s.prompt).toMatch(/test/i);
      expect(s.disallowedTools).toContain("Bash(git push:*)");
      expect(s.tools).toContain("Edit");
      for (const t of s.allowedTools) expect(t).not.toMatch(/git (push|checkout|merge)/);
    }
  });

  it("implementation lit la recherche et TODO.md; correction lance npm test et tsc", () => {
    const get = (id: string) => SECTORS.find((s) => s.id === id)!;
    expect(get("implementation").prompt).toMatch(/docs\/recherche\/fonctionnalites\.md/);
    expect(get("implementation").prompt).toMatch(/TODO\.md/);
    expect(get("correction").allowedTools).toContain("Bash(npm test:*)");
    expect(get("correction").allowedTools).toContain("Bash(npx tsc:*)");
  });
});

describe("runSector", () => {
  it("passe plafond, modele, outils et dontAsk au SDK et renvoie le cout", async () => {
    const { q, seen } = fake(1.5);
    const lines: string[] = [];
    const r = await runSector(SECTORS[0], { query: q, maxBudgetUsd: 4, log: (l) => lines.push(l) });
    expect(r).toMatchObject({ costUsd: 1.5, ok: true });
    const o = seen[0].options;
    expect(o.maxBudgetUsd).toBe(4);
    expect(o.permissionMode).toBe("dontAsk");
    expect(o.model).toBe(SECTORS[0].model);
    expect(o.allowedTools).toEqual(SECTORS[0].allowedTools);
    expect(lines[0]).toMatch(/implementation.*debut/);
    expect(lines[1]).toMatch(/fin.*\$1\.50/);
  });

  it("signale l'echec (ok=false) mais compte quand meme le cout", async () => {
    const { q } = fake(2, "error_max_budget_usd");
    expect(await runSector(SECTORS[1], { query: q, maxBudgetUsd: 2 })).toMatchObject({ costUsd: 2, ok: false });
  });
});
