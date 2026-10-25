/** Rapports « en cours » d'un run interrompu: archives et ignores automatiquement (la carte repart propre en idee). */
import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildBoard, reportPath } from "./cards";
import { createFileStale, createMemoryStale, hashOf, repairOrphans } from "./stale";
import type { QueryFn } from "./research";

const MD = "## Idees nouvelles\n\n- **Alpha idee** : a.\n- **Beta idee** : b.\n";
const STALE = "# Rapport : Alpha\nStatut : en-cours\n\n## Fait\n";
const files: Record<string, string> = { "docs/recherche/fonctionnalites.md": MD, "TODO.md": "", [reportPath("alpha-idee")]: STALE };
const readFile = async (p: string) => { if (!(p in files)) throw new Error("x"); return files[p]; };
const query = (() => (async function* () {})()) as QueryFn;
const base = { readFile, query, exists: async () => false };

describe("rapports perimes", () => {
  it("repairOrphans archive le rapport orphelin et la carte repart en idee, sans anomalie", async () => {
    const stale = createMemoryStale();
    const before = await buildBoard({ ...base, stale });
    expect(before.find((c) => c.id === "alpha-idee")!.anomalies[0]).toMatch(/orpheline/);
    const fixed = await repairOrphans(before, readFile, stale);
    expect(fixed).toEqual(["alpha-idee"]);
    const after = await buildBoard({ ...base, stale });
    expect(after.find((c) => c.id === "alpha-idee")).toMatchObject({ state: "idee", anomalies: [] });
    expect(after.find((c) => c.id === "beta-idee")!.state).toBe("idee");
  });
  it("un rapport reecrit apres la reparation (contenu different) compte de nouveau", async () => {
    const stale = createMemoryStale();
    await stale.retire("alpha-idee", STALE);
    files[reportPath("alpha-idee")] = STALE + "- fait un truc\n";
    const b = await buildBoard({ ...base, stale, active: new Set(["alpha-idee"]) });
    expect(b.find((c) => c.id === "alpha-idee")!.state).toBe("en-cours");
    files[reportPath("alpha-idee")] = STALE;
  });
  it("carte active: jamais reparee (son rapport en cours est normal)", async () => {
    const stale = createMemoryStale();
    const b = await buildBoard({ ...base, stale, active: new Set(["alpha-idee"]) });
    expect(await repairOrphans(b, readFile, stale)).toEqual([]);
  });
  it("registre fichier: archive horodatee + hash durable apres redemarrage", async () => {
    const d = mkdtempSync(join(tmpdir(), "stale-"));
    const s1 = createFileStale(join(d, "perimes.jsonl"), join(d, "archives"), () => 1700000000000);
    await s1.retire("alpha-idee", STALE);
    expect(readdirSync(join(d, "archives"))).toEqual(["alpha-idee-1700000000000.md"]);
    expect(readFileSync(join(d, "archives", "alpha-idee-1700000000000.md"), "utf8")).toBe(STALE);
    const s2 = createFileStale(join(d, "perimes.jsonl"), join(d, "archives"));
    expect((await s2.hashes()).get("alpha-idee")).toBe(hashOf(STALE));
  });
});
