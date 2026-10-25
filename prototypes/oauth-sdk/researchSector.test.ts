/** Secteur recherche: idees deja connues exclues, synthese precedente conservee (cache), modeles de la table. */
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createBudget } from "./budget";
import type { QueryFn } from "./research";
import { DOC, researchSector } from "./researchSector";
import type { BoucleEvent } from "./server";

const OLD = "# Recherche de fonctionnalites\n\n## Idees nouvelles\n\n- **Vieille idee** : ancienne\n\n## Absent de dk-table, present ailleurs\n\n\n## Negligees ou sous-utilisees ailleurs\n\n\n## Mal implementees ailleurs\n\n";

async function go(old: string | null) {
  const prompts: string[] = [];
  const q: QueryFn = ({ prompt }) => {
    prompts.push(prompt);
    return (async function* () { yield { type: "result", subtype: "success", result: "- **Vieille idee** : redite\n- **N1** : a\n- **N2** : b\n- **N3** : c", total_cost_usd: 0.01 }; })();
  };
  const written: Record<string, string> = {};
  const events: BoucleEvent[] = [];
  const s = researchSector((p, t) => { written[p] = t; }, () => old);
  await s.run({ query: q, budget: createBudget(20, 1), emit: (e) => events.push(e), dir: "/wt", signal: new AbortController().signal });
  return { prompts, doc: written[join("/wt", DOC)], events };
}

describe("researchSector", () => {
  it("synthese existante: ses idees sont citees dans la consigne, non redonnees, et conservees dans le nouveau fichier", async () => {
    const r = await go(OLD);
    expect(r.prompts[0]).toContain("Vieille idee");
    expect(r.doc).toContain("- **Vieille idee** : ancienne");
    expect(r.doc).not.toContain("redite");
    expect(r.doc).toContain("**N1**");
  });
  it("sans synthese: ecrit seulement les nouvelles idees (une fois chacune, meme trouvee par 4 axes)", async () => {
    const r = await go(null);
    expect(r.doc.match(/\*\*N1\*\*/g)).toHaveLength(1);
  });
});
