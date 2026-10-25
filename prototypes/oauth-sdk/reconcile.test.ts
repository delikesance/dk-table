/** Reconciliateur: etat unique justifiable par carte (idee -> en-cours -> preuves -> termine), anomalies visibles. */
import { describe, expect, it } from "vitest";
import { buildBoard, reportPath } from "./cards";
import { createMemoryLedger } from "./doneLedger";
import type { QueryFn } from "./research";
import { reconcileCard } from "./reconcile";
import { parseReport } from "./card";

const OK = "# Rapport : A\nStatut : termine\n\n## Fait\n- ok\n\n## Preuves\n- Tests : ok (3)\n- Captures : docs/screenshots/a/a.png\n";
const WIP = "# Rapport : A\nStatut : en-cours\n\n## Fait\n- debut\n";
const base = { status: "found" as const, report: undefined, proof: { ok: true, missing: [] as string[] }, active: false, ledgered: false };
const r = (md: string) => parseReport(md);

describe("reconcileCard", () => {
  it("I1: une tache TODO ouverte sans agent actif n'est PAS « en cours » (idee, sans anomalie)", () => {
    expect(reconcileCard({ ...base, status: "developing" })).toEqual({ state: "idee", missing: [], anomalies: [] });
  });
  it("I1: un agent du lot actif sans rapport encore = en cours", () => {
    expect(reconcileCard({ ...base, active: true }).state).toBe("en-cours");
  });
  it("I5: rapport « en cours » sans agent actif = orpheline (retour a idee, anomalie)", () => {
    const x = reconcileCard({ ...base, report: r(WIP) });
    expect(x.state).toBe("idee");
    expect(x.anomalies[0]).toMatch(/orpheline/);
  });
  it("rapport « en cours » avec agent actif = en cours, sans anomalie", () => {
    expect(reconcileCard({ ...base, report: r(WIP), active: true })).toMatchObject({ state: "en-cours", anomalies: [] });
  });
  it("I4: idee cochee dans le TODO sans rapport = preuves (rapport manquant) + anomalie, jamais invisible", () => {
    const x = reconcileCard({ ...base, status: "done" });
    expect(x).toMatchObject({ state: "preuves", missing: ["rapport"] });
    expect(x.anomalies[0]).toMatch(/finie.*sans rapport/);
  });
  it("I3: rapport termine avec preuves valides = termine; preuves manquantes = preuves + liste", () => {
    expect(reconcileCard({ ...base, report: r(OK) }).state).toBe("termine");
    const x = reconcileCard({ ...base, report: r(OK), proof: { ok: false, missing: ["capture absente : a.png"] } });
    expect(x).toMatchObject({ state: "preuves", missing: ["capture absente : a.png"] });
  });
  it("rapport « bloque » = bloque, meme sans agent", () => {
    expect(reconcileCard({ ...base, report: r("# Rapport : A\nStatut : bloque\n") }).state).toBe("bloque");
  });
  it("I6: inscrite au registre = termine quoi qu'il arrive", () => {
    expect(reconcileCard({ ...base, status: "developing", ledgered: true }).state).toBe("termine");
  });
  it("piste (idee marquee speculative) reste piste", () => {
    expect(reconcileCard({ ...base, status: "lead" }).state).toBe("piste");
  });
});

describe("buildBoard reconcilie", () => {
  const MD = "## Idees nouvelles\n\n- **Alpha idee** : a.\n- **Beta idee** : b.\n- **Gamma idee** : c.\n";
  const files: Record<string, string> = {
    "docs/recherche/fonctionnalites.md": MD,
    "TODO.md": "- [ ] Alpha idee en cours\n- [x] Beta idee faite\n",
    [reportPath("gamma-idee")]: WIP.replace("A", "Gamma"),
  };
  const readFile = async (p: string) => { if (!(p in files)) throw new Error("x"); return files[p]; };
  const query = (() => (async function* () {})()) as QueryFn;
  it("etats et anomalies du tableau: pas de faux en-cours, fini sans rapport visible, orpheline signalee", async () => {
    const b = Object.fromEntries((await buildBoard({ readFile, query, exists: async () => true, ledger: createMemoryLedger() })).map((c) => [c.id, c]));
    expect(b["alpha-idee"].state).toBe("idee");
    expect(b["beta-idee"]).toMatchObject({ state: "preuves", missing: ["rapport"] });
    expect(b["beta-idee"].anomalies.join()).toMatch(/sans rapport/);
    expect(b["gamma-idee"].state).toBe("idee");
    expect(b["gamma-idee"].anomalies.join()).toMatch(/orpheline/);
  });
  it("avec agents actifs sur le lot: alpha (sans rapport) et gamma (rapport en cours) sont en cours", async () => {
    const b = Object.fromEntries((await buildBoard({ readFile, query, exists: async () => true, active: new Set(["alpha-idee", "gamma-idee"]) })).map((c) => [c.id, c]));
    expect(b["alpha-idee"].state).toBe("en-cours");
    expect(b["gamma-idee"]).toMatchObject({ state: "en-cours", anomalies: [] });
  });
  it("I7: pur, deux lectures identiques donnent le meme tableau", async () => {
    const a = await buildBoard({ readFile, query, exists: async () => true });
    const c = await buildBoard({ readFile, query, exists: async () => true });
    expect(c).toEqual(a);
  });
});
