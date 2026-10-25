import { describe, expect, it } from "vitest";
import { FakeAgentRunner } from "../agent";
import { dedupe, extractFps, fingerprint, marker } from "../dedupe";
import { FakeGhClient, type Issue } from "../github";
import type { Finding } from "../roles/audit";

const f = (file: string, symptom: string): Finding => ({ file, symptom, severity: "high", repro: "r", confidence: 0.9 });
const issue = (o: Partial<Issue>): Issue => ({ number: 1, title: "", body: "", state: "open", labels: ["auto:bug"], ...o });

describe("fingerprint", () => {
  it("est stable malgré casse, espaces, ponctuation et nombres", () => {
    expect(fingerprint("src/a.ts", "Crash at line 12!")).toBe(fingerprint("src\\a.ts", "  crash   at LINE 99"));
    expect(fingerprint("src/a.ts", "x")).not.toBe(fingerprint("src/b.ts", "x"));
  });
  it("marqueur aller-retour", () => {
    const fp = fingerprint("a", "b");
    expect(extractFps(`texte ${marker(fp)} fin`)).toEqual([fp]);
  });
});

describe("dedupe", () => {
  const fp = fingerprint("src/a.ts", "boom");
  it("saute les empreintes déjà vues (ouvertes, fermées, rejetées)", async () => {
    for (const o of [{ state: "open" }, { state: "closed" }, { state: "closed", labels: ["auto:rejected"] }] as Partial<Issue>[]) {
      const gh = new FakeGhClient([issue({ body: marker(fp), ...o })]);
      const r = await dedupe([f("src/a.ts", "boom")], gh, new FakeAgentRunner());
      expect(r.fresh).toHaveLength(0);
      expect(r.skipped).toHaveLength(1);
    }
  });
  it("dédoublonne dans le lot", async () => {
    const r = await dedupe([f("a", "x 1"), f("a", "x 2")], new FakeGhClient(), new FakeAgentRunner());
    expect(r.fresh).toHaveLength(1);
  });
  it("cas flou: demande au runner haiku, sans appel s'il n'y a pas de candidat", async () => {
    const none = new FakeAgentRunner();
    expect((await dedupe([f("src/a.ts", "zzz")], new FakeGhClient(), none)).fresh).toHaveLength(1);
    expect(none.calls).toHaveLength(0);

    const gh = new FakeGhClient([issue({ number: 7, title: "bug in src/a.ts", body: "other" })]);
    const dup = new FakeAgentRunner([{ output: { duplicate: true, of: 7 } }]);
    const r = await dedupe([f("src/a.ts", "different words")], gh, dup);
    expect(r.fresh).toHaveLength(0);
    expect(dup.calls[0].model).toBe("haiku");
    const no = new FakeAgentRunner([{ output: { duplicate: false } }]);
    expect((await dedupe([f("src/a.ts", "different words")], gh, no)).fresh).toHaveLength(1);
  });
});
