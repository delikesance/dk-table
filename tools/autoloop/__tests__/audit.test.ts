import { describe, expect, it } from "vitest";
import { FakeAgentRunner } from "../agent";
import { AUDIT_SCHEMA, buildAuditPrompt, parseFindings, runAudit, truncateLines } from "../roles/audit";

const good = { file: "a.ts", symptom: "s", severity: "high", repro: "do x", confidence: 0.8 };

describe("audit", () => {
  it("tronque à 100 lignes", () => {
    const t = truncateLines(Array.from({ length: 300 }, (_, i) => `l${i}`).join("\n"));
    expect(t.split("\n").length).toBeLessThanOrEqual(101);
    expect(t).toContain("l0");
    expect(t).not.toContain("l150");
  });
  it("le prompt ne contient que les échecs", () => {
    const p = buildAuditPrompt([
      { name: "npm test", ok: false, output: "FAILCASE" },
      { name: "tsc", ok: true, output: "PASSOUT" },
    ]);
    expect(p).toContain("FAILCASE");
    expect(p).not.toContain("PASSOUT");
  });
  it("rejette les findings sans repro ou invalides", () => {
    const out = parseFindings({ findings: [good, { ...good, repro: " " }, { ...good, severity: "x" }, { file: 1 }] });
    expect(out).toEqual([good]);
    expect(parseFindings(null)).toEqual([]);
  });
  it("le schéma exige repro", () => {
    expect(JSON.stringify(AUDIT_SCHEMA)).toContain("repro");
  });
  it("runAudit appelle le runner en rôle audit avec le schéma", async () => {
    const r = new FakeAgentRunner([{ output: { findings: [good] } }]);
    const out = await runAudit(r, []);
    expect(out).toEqual([good]);
    expect(r.calls[0].role).toBe("audit");
    expect(r.calls[0].schema).toBe(AUDIT_SCHEMA);
  });
});
