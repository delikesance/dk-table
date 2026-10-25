import { describe, expect, it } from "vitest";
import { FakeAgentRunner } from "../agent";
import { Budget } from "../budget";
import { DEFAULT_CONFIG } from "../config";
import { runCycle } from "../cycle";
import { fingerprint, marker } from "../dedupe";
import { FakeGhClient } from "../github";
import { Journal } from "../journal";

const fd = (file: string, symptom: string, repro = "r") => ({ file, symptom, severity: "high", repro, confidence: 0.9 });

function setup(live: boolean) {
  const findings = [fd("x.ts", "norepro", ""), fd("dup.ts", "old"), fd("c.ts", "c"), fd("d.ts", "d"), fd("e.ts", "e"), fd("f.ts", "f")];
  const gh = new FakeGhClient([
    { number: 9, title: "t", body: marker(fingerprint("dup.ts", "old")), state: "closed", labels: ["auto:bug"] },
  ]);
  const lines: string[] = [];
  const budget = new Budget(DEFAULT_CONFIG);
  const deps = {
    runner: new FakeAgentRunner([{ output: { findings }, costUsd: 0.1 }]), gh, cfg: DEFAULT_CONFIG, budget,
    journal: new Journal((l) => lines.push(l)), cycle: 1, live,
    checks: async () => [{ name: "npm test", ok: false, output: "FAIL" }],
  };
  return { deps, gh, lines, budget };
}

describe("runCycle", () => {
  it("dry-run: audit -> dédoublonnage -> plafond, aucune création gh", async () => {
    const { deps, gh, lines, budget } = setup(false);
    const r = await runCycle(deps);
    expect(r.wouldCreate).toHaveLength(3);
    expect(r.created).toEqual([]);
    expect(gh.created).toHaveLength(0);
    expect(lines).toHaveLength(1);
    expect(budget.snapshot().calls).toBe(1);
  });
  it("live: crée au plus 3 issues auto:bug avec marqueur fp", async () => {
    const { deps, gh } = setup(true);
    const r = await runCycle(deps);
    expect(r.created).toHaveLength(3);
    expect(gh.created[0].labels).toEqual(["auto:bug"]);
    expect(gh.created[0].body).toContain("<!-- fp:");
  });
  it("ne fait rien si le budget est épuisé", async () => {
    const { deps, budget } = setup(true);
    for (let i = 0; i < DEFAULT_CONFIG.maxCalls; i++) budget.record({ costUsd: 0, inputTokens: 0, outputTokens: 0 });
    expect((await runCycle(deps)).created).toEqual([]);
    expect(deps.runner.calls).toHaveLength(0);
  });
});
