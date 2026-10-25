import { describe, expect, it } from "vitest";
import { FakeAgentRunner, ROLE_TOOLS, buildSdkOptions } from "../agent";
import { DEFAULT_CONFIG } from "../config";

describe("FakeAgentRunner", () => {
  it("rejoue les réponses dans l'ordre et enregistre les requêtes", async () => {
    const f = new FakeAgentRunner([{ output: { bugs: 2 } }]);
    const r = await f.run({ role: "audit", prompt: "p" });
    expect(r.ok).toBe(true);
    expect(r.output).toEqual({ bugs: 2 });
    expect(f.calls).toHaveLength(1);
    expect(f.calls[0].role).toBe("audit");
  });
  it("renvoie un résultat par défaut quand la file est vide", async () => {
    const r = await new FakeAgentRunner().run({ role: "worker", prompt: "p" });
    expect(r.ok).toBe(true);
    expect(r.costUsd).toBe(0);
  });
});

describe("buildSdkOptions", () => {
  it("applique les garde-fous: pas de clé API, pas de settings, dontAsk, outils par rôle", () => {
    const o = buildSdkOptions("audit", DEFAULT_CONFIG, { ANTHROPIC_API_KEY: "x", FOO: "1" });
    expect(o.env.ANTHROPIC_API_KEY).toBeUndefined();
    expect(o.env.FOO).toBe("1");
    expect(o.settingSources).toEqual([]);
    expect(o.permissionMode).toBe("dontAsk");
    expect(o.maxTurns).toBe(15);
    expect(o.maxBudgetUsd).toBe(DEFAULT_CONFIG.roles.audit.maxBudgetUsd);
    expect(o.allowedTools).toEqual(ROLE_TOOLS.audit);
  });
  it("l'audit et le reviewer sont en lecture seule", () => {
    for (const r of ["audit", "reviewer"] as const) {
      expect(ROLE_TOOLS[r]).not.toContain("Edit");
      expect(ROLE_TOOLS[r]).not.toContain("Write");
    }
  });
});
