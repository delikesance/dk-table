/** Preuves et TODO.md ecrits par le code : statut calcule, section Preuves reelle, aucune regex sur un « ok » declare. */
import { describe, expect, it } from "vitest";
import { parseReport, validateReport, type Proof } from "./card";
import { applyProof, statusFrom, tickTodo } from "./proveReport";

const GREEN: Proof = { tests: { ok: true, count: 458, scope: "related" }, tsc: { ok: true } };
const AGENT = "# Rapport : Tri multi-colonnes\nVisible : oui\n\n## Fait\n- Tri sur 2 colonnes\n\n## Non fait\n- aucun\n\n## Captures\n- docs/screenshots/tri/clair.png, docs/screenshots/tri/sombre.png\n\n## Decisions\n- stable\n";

describe("applyProof", () => {
  it("ecrit statut termine et preuves reelles; le rapport devient valide sans aucune ligne « ok » de l'agent", () => {
    const { md, status } = applyProof(AGENT, GREEN, () => true);
    expect(status).toBe("termine");
    expect(md).toContain("Statut : termine");
    expect(md).toContain("- Tests : ok (458 tests, tests lies aux fichiers modifies)");
    expect(md).toContain("- Typecheck : ok");
    const r = parseReport(md);
    expect(r.proof).toEqual({ tests: { ok: true, count: 458, scope: "related" }, tsc: { ok: true } });
    expect(r.screenshots).toEqual(["docs/screenshots/tri/clair.png", "docs/screenshots/tri/sombre.png"]);
    expect(validateReport(r, () => true)).toEqual({ ok: true, missing: [] });
  });
  it("un « Tests : ok » ecrit par l'agent ne prouve rien", () => {
    const forged = "# Rapport : x\nStatut : termine\nVisible : non\n\n## Fait\n- a\n\n## Preuves\n- Tests : ok (999 tests)\n";
    expect(validateReport(parseReport(forged), () => true).missing).toContain("preuves");
  });
  it("remplace l'ancienne section Preuves et l'ancien Statut (idempotent)", () => {
    const once = applyProof(AGENT + "\nStatut : bloque\n## Preuves\n- Tests : ok (1)\n", GREEN, () => true).md;
    const twice = applyProof(once, GREEN, () => true).md;
    expect(twice).toBe(once);
    expect((once.match(/Statut :/g) ?? []).length).toBe(1);
    expect((once.match(/## Preuves/g) ?? []).length).toBe(1);
  });
  it("capture absente signalee; carte non visible: sans objet", () => {
    expect(applyProof(AGENT, GREEN, () => false).md).toContain("clair.png (absente)");
    const hidden = applyProof(AGENT.replace("Visible : oui", "Visible : non"), GREEN, () => false).md;
    expect(hidden).toContain("- Captures : sans objet");
    expect(validateReport(parseReport(hidden), () => false).ok).toBe(true);
  });
  it("tests rouges: preuves en echec, carte non terminee", () => {
    const { md } = applyProof(AGENT, { tests: { ok: false }, tsc: { ok: true } }, () => true);
    expect(validateReport(parseReport(md), () => true).missing).toContain("preuves");
  });
});

describe("statusFrom", () => {
  it("termine / en-cours / bloque d'apres Fait, Non fait, Bloque", () => {
    expect(statusFrom(AGENT)).toBe("termine");
    expect(statusFrom(AGENT.replace("- aucun", "- reste le tri inverse"))).toBe("en-cours");
    expect(statusFrom("# Rapport : x\n\n## Fait\n\n## Non fait\n")).toBe("en-cours");
    expect(statusFrom(AGENT + "\n## Bloque\n- API absente\n")).toBe("bloque");
  });
});

describe("tickTodo", () => {
  it("coche la tache qui correspond", () => {
    const out = tickTodo("# TODO\n- [ ] Tri multi-colonnes dans la grille\n- [ ] Autre chose\n", "Tri multi-colonnes", "tri");
    expect(out).toContain("- [x] Tri multi-colonnes dans la grille");
    expect(out).toContain("- [ ] Autre chose");
  });
  it("deja cochee: inchange; sans ligne: ajoutee sous ## Boucle (creee si besoin)", () => {
    expect(tickTodo("- [x] Tri multi-colonnes\n", "Tri multi-colonnes", "tri")).toBe("- [x] Tri multi-colonnes\n");
    const added = tickTodo("# TODO\n- [ ] Autre\n", "Tri multi-colonnes", "tri");
    expect(added).toContain("## Boucle");
    expect(added).toContain("- [x] Tri multi-colonnes (carte tri)");
    expect(tickTodo(added, "Filtre rapide", "f")).toMatch(/## Boucle\n- \[x\] Filtre rapide \(carte f\)\n/);
  });
});
