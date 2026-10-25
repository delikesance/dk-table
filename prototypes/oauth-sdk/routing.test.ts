/** Table de routage tache -> modele: plus petit modele suffisant, repli vers un plus gros apres echec, configurable. */
import { describe, expect, it } from "vitest";
import { ROUTES, costUnits, modelFor, parseOverride } from "./routing";

describe("modelFor", () => {
  it("taches simples sur haiku: resume, trancheur, correction, implementation au premier essai", () => {
    for (const t of ["summary", "trancheur", "correction", "implementation"] as const) expect(modelFor(t, 0)).toBe("haiku");
  });
  it("design sur sonnet (raisonnement), recherche sur haiku (escalade sonnet), jamais opus par defaut", () => {
    expect(modelFor("research", 0)).toBe("haiku");
    expect(modelFor("research", 1)).toBe("sonnet");
    expect(modelFor("design", 0)).toBe("sonnet");
    for (const chain of Object.values(ROUTES)) expect(chain[0]).not.toBe("opus");
  });
  it("repli: chaque echec (ou validation par code en echec) monte d'un cran, plafonne au dernier modele", () => {
    expect(modelFor("implementation", 1)).toBe("sonnet");
    expect(modelFor("implementation", 2)).toBe("opus");
    expect(modelFor("implementation", 9)).toBe("opus");
    expect(modelFor("correction", 1)).toBe("sonnet");
    expect(modelFor("summary", 5)).toBe(ROUTES.summary.at(-1));
  });
  it("configurable par BOUCLE_MODELS (JSON): chaine d'une tache remplacee, le reste inchange", () => {
    const o = parseOverride('{"implementation":["sonnet","opus"],"junk":["x"]}');
    expect(modelFor("implementation", 0, o)).toBe("sonnet");
    expect(modelFor("correction", 0, o)).toBe("haiku");
  });
  it("override invalide ou vide: ignore sans lever", () => {
    expect(parseOverride("pas du json")).toEqual({});
    expect(parseOverride(undefined)).toEqual({});
    expect(parseOverride('{"implementation":[]}')).toEqual({});
  });
});

describe("costUnits", () => {
  it("poids relatifs haiku 1 < sonnet 3 < opus 15", () => {
    expect(costUnits(["haiku", "sonnet", "opus"])).toBe(19);
  });
});
