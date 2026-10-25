/** Recherche rapide et economique: haiku d'abord, escalade, tours et budget bornes, une seule passe si suffisant, doublons, idees connues. */
import { describe, expect, it } from "vitest";
import { createBudget } from "./budget";
import { AXES, runResearch, type QueryFn } from "./research";
import { nameOf } from "./researchMerge";

/** Query factice: reponse par appel via `reply(axe, modele, n)`; enregistre prompts et options. */
function fake(reply: (axis: string, model: string, n: number) => string, cost = 0.05) {
  const calls: { prompt: string; options: Record<string, unknown>; axis: string }[] = [];
  const q: QueryFn = ({ prompt, options }) => {
    const axis = AXES.find((a) => prompt.includes(a.ask))!.id;
    calls.push({ prompt, options, axis });
    const text = reply(axis, String(options.model), calls.length);
    return (async function* () { yield { type: "result", subtype: "success", result: text, total_cost_usd: Math.min(cost, options.maxBudgetUsd as number) }; })();
  };
  return { q, calls };
}
const bullets = (axis: string, n: number) => Array.from({ length: n }, (_, i) => `- **${axis} ${i}** : texte, source, valeur`).join("\n");
const run = (f: ReturnType<typeof fake>, o: Partial<Parameters<typeof runResearch>[0]> = {}) => runResearch({ query: f.q, budget: createBudget(20, 1), ...o });

describe("modeles et bornes", () => {
  it("haiku par defaut pour les 4 axes, 8 tours au plus, consigne de limiter les recherches web", async () => {
    const f = fake((a) => bullets(a, 5));
    await run(f);
    expect(f.calls.map((c) => c.options.model)).toEqual(Array(4).fill("haiku"));
    expect(f.calls.every((c) => (c.options.maxTurns as number) <= 8)).toBe(true);
    expect(f.calls.every((c) => /au plus \d+ recherches web/.test(c.prompt))).toBe(true);
  });
  it("plafond par axe: jamais plus de 0,30 $ par requete, meme avec un gros budget", async () => {
    const f = fake((a) => bullets(a, 5));
    await run(f, { budget: createBudget(100, 1) });
    expect(Math.max(...f.calls.map((c) => c.options.maxBudgetUsd as number))).toBeLessThanOrEqual(0.3);
  });
  it("BOUCLE_MODELS: la chaine de la recherche est remplacee", async () => {
    const f = fake((a) => bullets(a, 5));
    await run(f, { models: { research: ["sonnet"] } });
    expect(f.calls.every((c) => c.options.model === "sonnet")).toBe(true);
  });
});

describe("une seule passe quand elle suffit", () => {
  it("chaque axe >= 3 idees: 4 requetes, pas de deuxieme tour", async () => {
    const f = fake((a) => bullets(a, 3));
    await run(f, { maxRounds: 2 });
    expect(f.calls).toHaveLength(4);
  });
  it("un axe vide ou pauvre: seul cet axe est relance, avec le modele suivant (sonnet)", async () => {
    const f = fake((a, m) => (a === "mal" && m === "haiku" ? "rien" : bullets(a, 4)));
    const out = await run(f, { maxRounds: 2 });
    expect(f.calls).toHaveLength(5);
    expect(f.calls[4]).toMatchObject({ axis: "mal" });
    expect(f.calls[4].options.model).toBe("sonnet");
    expect(out.items.mal.length).toBeGreaterThanOrEqual(3);
  });
  it("le deuxieme tour ne repete pas ce qui est deja trouve", async () => {
    const f = fake((a, m) => (a === "mal" && m === "haiku" ? bullets("mal", 2) : bullets(a, 4)));
    await run(f, { maxRounds: 2 });
    expect(f.calls[4].prompt).toContain("mal 0");
  });
});

describe("doublons et idees connues", () => {
  it("meme idee trouvee par deux axes: une seule fois dans la synthese", async () => {
    const f = fake((a) => `- **Idee commune** : x\n${bullets(a, 3)}`);
    const out = await run(f, { maxRounds: 1 });
    const total = Object.values(out.items).flat().filter((i) => nameOf(i) === nameOf("**Idee commune**"));
    expect(total).toHaveLength(1);
    expect(out.markdown.match(/Idee commune/g)).toHaveLength(1);
  });
  it("idees deja connues (known): exclues de la sortie et nommees dans la consigne", async () => {
    const f = fake((a) => `- **Deja vue** : x\n${bullets(a, 3)}`);
    const out = await run(f, { maxRounds: 1, known: new Set([nameOf("**Deja vue**")]), knownTitles: ["Deja vue"] });
    expect(Object.values(out.items).flat().some((i) => /Deja vue/.test(i))).toBe(false);
    expect(f.calls[0].prompt).toContain("Deja vue");
  });
});
