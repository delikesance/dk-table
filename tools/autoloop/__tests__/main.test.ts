import { describe, expect, it } from "vitest";
import { FakeAgentRunner } from "../agent";
import { FakeGhClient } from "../github";
import { parseArgs, runDry } from "../main";

describe("parseArgs", () => {
  it("dry-run par défaut", () => {
    expect(parseArgs([]).dryRun).toBe(true);
  });
  it("lit --env-file et --live", () => {
    const a = parseArgs(["--env-file", ".env", "--live"]);
    expect(a.envFile).toBe(".env");
    expect(a.dryRun).toBe(false);
  });
});

describe("runDry", () => {
  it("termine sur un critère d'arrêt sans appel réel", async () => {
    const r = await runDry({ stopFile: () => false, log: () => {}, append: () => {} });
    expect(["idle", "budget", "iterations"]).toContain(r.reason);
    expect(r.actions[0]).toBe("audit");
  });
  it("cycle audit complet avec fakes: aucune création gh, journal écrit", async () => {
    const finding = { file: "a.ts", symptom: "s", severity: "high", repro: "r", confidence: 1 };
    const gh = new FakeGhClient();
    const lines: string[] = [];
    const runner = new FakeAgentRunner([{ output: { findings: [finding] } }]);
    const r = await runDry({ stopFile: () => false, log: () => {}, append: (l) => lines.push(l), runner, gh });
    expect(r.actions[0]).toBe("audit");
    expect(r.actions).toContain("fix-bug");
    expect(gh.created).toHaveLength(0);
    expect(lines.length).toBeGreaterThan(0);
  });
  it("respecte le fichier STOP", async () => {
    const r = await runDry({ stopFile: () => true, log: () => {}, append: () => {} });
    expect(r.reason).toBe("stop-file");
  });
});
