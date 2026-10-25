/** Tests du moodboard : statuts (found/developing/lead), resume Haiku groupe, cache, budget, repli sans LLM. */
import { describe, expect, it } from "vitest";
import { createBudget } from "./budget";
import { readFileSync } from "node:fs";
import { IDLE_EUR, buildMoodboard, fallbackSummary, matches, pickBudget } from "./moodboard";
import type { QueryFn } from "./research";

const MD = `# Recherche

## Idees nouvelles

- **Graphe de dépendances complet** : Excel n'affiche qu'une couche. Valeur forte.
- **Historique par cellule** : un journal local. À confirmer, piste non vérifiée.
- **Vue fiche d'une ligne** : formulaire par enregistrement.

## Absent de dk-table, present ailleurs

- **Validation de données** : listes déroulantes.
- **Tableau croisé dynamique** : synthèse.

## Mal implementees ailleurs

- **Annulation conservée après macro** : Excel la perd.
`;
const TODO = `# TODO
- [ ] Recherche: graphe de dépendances inter-feuilles en un clic
- [x] Validation de données (listes) faite
Note: tableau croisé dynamique à étudier un jour
`;
const files: Record<string, string> = { "docs/recherche/fonctionnalites.md": MD, "TODO.md": TODO };
const readFile = async (p: string) => { if (!(p in files)) throw new Error("nofile"); return files[p]; };

/** Query factice : repond "n|resume n" pour chaque idee du prompt, cout fixe. */
function fake(cost = 0.002) {
  const calls: { prompt: string; options: Record<string, unknown> }[] = [];
  const q: QueryFn = ({ prompt, options }) => {
    calls.push({ prompt, options });
    const n = (prompt.match(/^\d+\. /gm) ?? []).length;
    return (async function* () {
      yield { type: "result", subtype: "success", total_cost_usd: cost,
        result: Array.from({ length: n }, (_, i) => `${i + 1}|resume ${i + 1}`).join("\n") };
    })();
  };
  return { q, calls };
}

describe("matches / fallbackSummary", () => {
  it("appariement par mots significatifs, accents ignores", () => {
    expect(matches("Graphe de dépendances complet", "graphe de dependances inter-feuilles")).toBe(true);
    expect(matches("Vue fiche", "autre chose")).toBe(false);
  });
  it("repli: premiere phrase ou 80 caracteres", () => {
    expect(fallbackSummary("Une phrase. Deux.")).toBe("Une phrase.");
    expect(fallbackSummary("x".repeat(200)).length).toBeLessThanOrEqual(80);
  });
});

describe("buildMoodboard", () => {
  it("statuts: developing (tache ouverte), lead (piste/mention), found, tache faite exclue", async () => {
    const cards = await buildMoodboard({ readFile, query: fake().q });
    const by = Object.fromEntries(cards.map((c) => [c.title, c]));
    expect(by["Graphe de dépendances complet"].status).toBe("developing");
    expect(by["Historique par cellule"].status).toBe("lead");
    expect(by["Tableau croisé dynamique"].status).toBe("lead");
    expect(by["Vue fiche d'une ligne"].status).toBe("found");
    expect(by["Validation de données"]).toBeUndefined();
    expect(by["Vue fiche d'une ligne"].axis).toBe("new");
    expect(by["Annulation conservée après macro"].axis).toBe("poor");
  });
  it("un seul appel Haiku groupe, sans outil, 1 tour, plafond par carte", async () => {
    const f = fake();
    const cards = await buildMoodboard({ readFile, query: f.q });
    expect(f.calls).toHaveLength(1);
    expect(f.calls[0].options).toMatchObject({ model: "haiku", maxTurns: 1, tools: [] });
    expect(f.calls[0].options.maxBudgetUsd).toBeCloseTo(0.01 * cards.length);
    expect(cards[0].summary).toBe("resume 1");
  });
  it("cache: second appel sans requete; cout regle dans le budget", async () => {
    const f = fake(0.003);
    const budget = createBudget(1);
    const cache = new Map<string, string>();
    await buildMoodboard({ readFile, query: f.q, budget, cache });
    expect(budget.spent()).toBeCloseTo(0.003);
    await buildMoodboard({ readFile, query: f.q, budget, cache });
    expect(f.calls).toHaveLength(1);
  });
  it("repli sans LLM: erreur, budget epuise, jeton absent; ne leve jamais", async () => {
    const boom: QueryFn = () => { throw new Error("x"); };
    const a = await buildMoodboard({ readFile, query: boom });
    expect(a.every((c) => c.summary.length > 0 && c.summary.length <= 80)).toBe(true);
    const f = fake();
    const b = createBudget(0.001);
    b.settle(0, 1);
    await buildMoodboard({ readFile, query: f.q, budget: b });
    await buildMoodboard({ readFile, query: f.q, env: {} });
    expect(f.calls).toHaveLength(0);
    expect(await buildMoodboard({ readFile: async () => { throw new Error("no"); }, query: f.q })).toEqual([]);
  });
});

describe("budget du moodboard", () => {
  it("pendant un run: le budget partage de la boucle; hors run: un petit plafond neuf (<= 0,05 EUR)", () => {
    const shared = createBudget(5);
    expect(pickBudget(() => shared)).toBe(shared);
    const idle = pickBudget(() => null, 1);
    expect(idle).not.toBe(shared);
    expect(idle.remaining()).toBeLessThanOrEqual(0.05);
    expect(IDLE_EUR).toBeLessThanOrEqual(0.05);
  });

  it("les resumes sont regles dans le budget partage (jamais au-dela)", async () => {
    const shared = createBudget(1, 1);
    const q: QueryFn = ({ options }) => (async function* () {
      yield { type: "result", subtype: "success", result: "1|ok", total_cost_usd: Math.min(0.02, options.maxBudgetUsd as number) };
    })();
    await buildMoodboard({ readFile, query: q, budget: shared, cache: new Map(), env: { CLAUDE_CODE_OAUTH_TOKEN: "x" } });
    expect(shared.spent()).toBeGreaterThan(0);
    expect(shared.spent()).toBeLessThanOrEqual(1);
  });

  it("champs de la vue = MoodCard (statuts et axes connus de moodboard.html)", async () => {
    const html = readFileSync(new URL("./moodboard.html", import.meta.url), "utf-8");
    const cards = await buildMoodboard({ readFile, query: (() => (async function* () {})()) as QueryFn });
    for (const c of cards) {
      expect(html).toContain(`${c.status}:`);
      if (c.axis) expect(html).toContain(`${c.axis}:`);
      expect(Object.keys(c).sort()).toEqual(["axis", "id", "source", "status", "summary", "title"]);
    }
    for (const f of ["c.status", "c.axis", "c.summary", "c.source", "c.title"]) expect(html).toContain(f);
  });
});
