/** Tests des options Agent SDK communes: skills et outils de Claude Code restent disponibles. */
import { describe, expect, it } from "vitest";
import { agentOptions, NO_GIT } from "./agentOptions";

describe("agentOptions", () => {
  for (const mode of ["research", "edit"] as const) {
    it(`${mode}: jeu d'outils complet de Claude Code (skills, sous-agents, MCP), jamais une liste fermee`, () => {
      const o = agentOptions(mode, { env: { A: "1" } });
      expect(o.tools).toEqual({ type: "preset", preset: "claude_code" });
      expect(o.skills).toBe("all");
      expect(o.settingSources).toEqual(["user", "project"]);
      expect(o.allowedTools).toEqual(expect.arrayContaining(["Skill", "Agent", "Read", "Grep", "Glob", "WebSearch", "WebFetch"]));
      expect(o.env).toEqual({ A: "1" });
    });
    it(`${mode}: prompt systeme du preset claude_code, sans section dynamique (cache partage)`, () => {
      const o = agentOptions(mode);
      expect(o.systemPrompt).toMatchObject({ type: "preset", preset: "claude_code", excludeDynamicSections: true });
    });
    it(`${mode}: git en ecriture interdit (la boucle gere les branches)`, () => {
      const o = agentOptions(mode);
      for (const g of NO_GIT) expect(o.disallowedTools).toContain(g);
      expect(o.disallowedTools).toContain("Bash(git push:*)");
    });
  }
  it("research: ne peut pas modifier le depot (Edit/Write non pre-approuves)", () => {
    const o = agentOptions("research");
    expect(o.allowedTools).not.toContain("Edit");
    expect(o.allowedTools).not.toContain("Write");
    expect(o.allowedTools).not.toContain("Bash");
  });
  it("edit: edition et shell pre-approuves (tests, tsc, npx, npm)", () => {
    const o = agentOptions("edit");
    expect(o.allowedTools).toEqual(expect.arrayContaining(["Edit", "Write", "Bash"]));
    expect(o.permissionMode).toBe("dontAsk");
  });
  it("aide: une requete d'un tour sans outil ni skill ni reglage disque", () => {
    const o = agentOptions("helper");
    expect(o.tools).toEqual([]);
    expect(o.settingSources).toEqual([]);
    expect(o.skills).toBeUndefined();
    expect(o.maxTurns).toBe(1);
  });
  it("transmet le dossier, le plafond et l'abandon", () => {
    const abort = new AbortController();
    const o = agentOptions("edit", { cwd: "/w", maxBudgetUsd: 3, abort, model: "sonnet", maxTurns: 9 });
    expect([o.cwd, o.maxBudgetUsd, o.abortController, o.model, o.maxTurns]).toEqual(["/w", 3, abort, "sonnet", 9]);
  });
  it("autonomie: pas de question a l'utilisateur, un sous-agent trancheur decide a la place", () => {
    const o = agentOptions("edit");
    expect(o.disallowedTools).toContain("AskUserQuestion");
    const ag = (o.agents as Record<string, { description: string; prompt: string; model: string; tools: string[]; maxTurns: number }>).trancheur;
    expect(ag.model).toBe("haiku"); // routage: arbitrage leger sur le plus petit modele (table routing.ts)
    expect(ag.description).toMatch(/doute|question/i);
    expect(ag.prompt).toMatch(/decision|tranche/i);
    expect(ag.tools).toEqual(expect.arrayContaining(["Read", "Grep", "Glob"]));
    expect(ag.tools).not.toContain("Edit");
    expect(ag.maxTurns).toBeLessThanOrEqual(10);
  });
});
