/** Tests du tableau des cartes : etat par carte d'apres rapport et preuves, boucle terminee quand tout est fait. */
import { describe, expect, it } from "vitest";
import { allDone, buildBoard, cardDetail, reportPath } from "./cards";
import type { QueryFn } from "./research";

const MD = `## Idees nouvelles

- **Alpha idee** : premiere. Texte.
- **Beta idee** : deuxieme.
- **Gamma idee** : troisieme.
- **Delta idee** : quatrieme.
`;
const done = "# Rapport : Beta\nStatut : termine\n\n## Fait\n- ok\n\n## Preuves\n- Tests : ok (12)\n- Captures : docs/screenshots/b/a.png\n";
const files: Record<string, string> = {
  "docs/recherche/fonctionnalites.md": MD, "TODO.md": "- [ ] Alpha idee en cours\n",
  [reportPath("beta-idee")]: done,
  [reportPath("gamma-idee")]: done.replace("Beta", "Gamma").replace("a.png", "absente.png"),
  [reportPath("delta-idee")]: "# Rapport : Delta\nStatut : bloque\n",
};
const exists = async (p: string) => p === "docs/screenshots/b/a.png";
const readFile = async (p: string) => { if (!(p in files)) throw new Error("x"); return files[p]; };
const query = (() => (async function* () {})()) as QueryFn;

describe("buildBoard", () => {
  it("etat par carte: en-cours, termine, preuves manquantes, bloque", async () => {
    const b = await buildBoard({ readFile, query, exists });
    const s = Object.fromEntries(b.map((c) => [c.id, c]));
    expect(s["alpha-idee"].state).toBe("en-cours");
    expect(s["beta-idee"].state).toBe("termine");
    expect(s["gamma-idee"].state).toBe("preuves");
    expect(s["gamma-idee"].missing[0]).toMatch(/absente\.png/);
    expect(s["delta-idee"].state).toBe("bloque");
    expect(s["beta-idee"].reportPath).toBe("docs/rapports/beta-idee.md");
  });
  it("allDone: vrai seulement si toutes les cartes sont terminees (ou aucune)", async () => {
    const b = await buildBoard({ readFile, query, exists });
    expect(allDone(b)).toBe(false);
    expect(allDone(b.filter((c) => c.state === "termine"))).toBe(true);
    expect(allDone([])).toBe(true);
  });
});

describe("cardDetail", () => {
  it("rapport en direct: markdown brut, analyse, etat et preuves manquantes", async () => {
    const read = async (p: string) => files[p] ?? null;
    const d = await cardDetail("gamma-idee", read, exists);
    expect(d?.state).toBe("preuves");
    expect(d?.markdown).toContain("Statut : termine");
    expect(d?.report.done).toEqual(["ok"]);
    expect((await cardDetail("beta-idee", read, exists))?.state).toBe("termine");
    expect(await cardDetail("nope", read, exists)).toBeNull();
    expect(await cardDetail("../x", read, exists)).toBeNull();
  });
});
