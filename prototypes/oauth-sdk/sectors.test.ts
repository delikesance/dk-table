/** Tests des secteurs implementation / correction / design (query factice, sans reseau ni cout). */
import { describe, expect, it } from "vitest";
import { createBudget } from "./budget";
import { MODEL_BY_KIND, type QueryFn } from "./research";
import type { BoucleEvent } from "./server";
import { SECTORS, SECTOR_DEFS, designPath, runSector } from "./sectors";

/** Query factice : enregistre les options, cout `cost` borne par maxBudgetUsd. */
function fake(cost: number, subtype = "success") {
  const seen: { prompt: string; options: Record<string, unknown> }[] = [];
  const q: QueryFn = (a) => {
    seen.push(a);
    return (async function* () {
      yield { type: "result", subtype, result: "fait", total_cost_usd: Math.min(cost, a.options.maxBudgetUsd as number) };
    })();
  };
  return { q, seen };
}

describe("definitions", () => {
  it("implementation, correction, design: contrat {name, run}", () => {
    expect(SECTORS.map((s) => s.name)).toEqual(["design", "implementation", "correction"]);
    for (const s of SECTORS) expect(typeof s.run).toBe("function");
  });

  it("prompts TDD/CLAUDE.md, git interdit, dontAsk", () => {
    for (const s of SECTOR_DEFS) {
      expect(s.prompt).toMatch(/CLAUDE\.md/);
      expect(s.disallowedTools).toContain("Bash(git push:*)");
      expect(s.tools).toContain("Edit");
      for (const t of s.allowedTools) expect(t).not.toMatch(/git (push|checkout|merge)/);
    }
    const get = (id: string) => SECTOR_DEFS.find((s) => s.id === id)!;
    expect(get("implementation").prompt).toMatch(/docs\/recherche\/fonctionnalites\.md/);
    expect(get("correction").allowedTools).toContain("Bash(npx tsc:*)");
  });
});

describe("design d'abord", () => {
  it("le design ecrit docs/design/<date>.md; l'implementation le lit, repli sur recherche + TODO", () => {
    const get = (id: string) => SECTOR_DEFS.find((s) => s.id === id)!;
    expect(designPath(new Date("2026-10-25T10:00:00Z"))).toBe("docs/design/2026-10-25.md");
    expect(get("design").prompt).toContain(designPath());
    expect(get("design").prompt).toContain("interfaces");
    expect(get("implementation").prompt).toContain(designPath());
    expect(get("implementation").prompt).toContain("docs/recherche/fonctionnalites.md");
    expect(get("implementation").prompt).toContain("TODO.md");
  });
});

describe("modeles par type de tache", () => {
  it("chaque secteur est une seule requete think (choix + edition melanges) -> sonnet", async () => {
    for (const d of SECTOR_DEFS) {
      expect(d.kind).toBe("think");
      const { q, seen } = fake(0.1);
      await runSector(d, { query: q, maxBudgetUsd: 1 });
      expect(seen[0].options.model).toBe("sonnet");
    }
  });
});

describe("runSector", () => {
  it("passe plafond, modele, outils, dontAsk et cwd au SDK", async () => {
    const { q, seen } = fake(1.5);
    const r = await runSector(SECTOR_DEFS[0], { query: q, maxBudgetUsd: 4, cwd: "/w" });
    expect(r).toMatchObject({ costUsd: 1.5, ok: true });
    const o = seen[0].options;
    expect([o.maxBudgetUsd, o.permissionMode, o.cwd]).toEqual([4, "dontAsk", "/w"]);
    expect(o.model).toBe(MODEL_BY_KIND[SECTOR_DEFS[0].kind]);
  });
});

describe("SECTORS[].run", () => {
  const ctx = (q: QueryFn, eur = 20, signal = new AbortController().signal) => {
    const events: BoucleEvent[] = [];
    const budget = createBudget(eur, 1);
    return { c: { query: q, budget, emit: (e: BoucleEvent) => events.push(e), dir: "/w", signal }, events, budget };
  };

  it("reserve/regle le budget et emet start puis end avec cout et duree", async () => {
    const { q } = fake(1);
    const { c, events, budget } = ctx(q);
    await SECTORS[0].run(c);
    expect(events[0]).toMatchObject({ type: "start", sector: "design" });
    const end = events.find((e) => e.type === "end")!;
    expect(end).toMatchObject({ sector: "design", costUsd: 1 });
    expect(end.elapsedS).toBeGreaterThanOrEqual(0);
    expect(budget.spent()).toBe(1);
    expect(budget.remaining()).toBe(19);
  });

  it("ne depasse jamais le plafond et ne lance rien si le budget est epuise", async () => {
    const { q, seen } = fake(100);
    const { c, budget } = ctx(q, 10);
    await SECTORS[0].run(c);
    expect(budget.spent()).toBeLessThanOrEqual(10);
    budget.settle(0, 9); // budget epuise (>= 90 %)
    const n = seen.length;
    await SECTORS[1].run(c);
    expect(seen.length).toBe(n);
  });

  it("ne lance rien si le signal est deja abandonne", async () => {
    const ac = new AbortController();
    ac.abort();
    const { q, seen } = fake(1);
    await SECTORS[0].run(ctx(q, 20, ac.signal).c);
    expect(seen).toHaveLength(0);
  });
});
