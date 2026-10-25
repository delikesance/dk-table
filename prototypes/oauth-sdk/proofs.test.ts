/** Section « Preuves » d'un rapport: liste de chemins, accolades, « sans objet », notes entre parentheses. */
import { describe, expect, it } from "vitest";
import { expandBraces, parseCaptures } from "./proofs";
import { parseReport, validateReport } from "./card";

describe("expandBraces", () => {
  it("produit cartesien des groupes, ordre stable; sans accolade: inchange", () => {
    expect(expandBraces("a/{x,y}-{clair,sombre}.png")).toEqual(["a/x-clair.png", "a/x-sombre.png", "a/y-clair.png", "a/y-sombre.png"]);
    expect(expandBraces("a/b.png")).toEqual(["a/b.png"]);
    expect(expandBraces("a/{ x , y }.png")).toEqual(["a/x.png", "a/y.png"]);
  });
});
describe("parseCaptures", () => {
  it("liste simple, ignorant backticks et espaces", () => {
    expect(parseCaptures("`docs/s/a.png`, docs/s/b.png")).toEqual({ paths: ["docs/s/a.png", "docs/s/b.png"], exempt: false });
  });
  it("accolades: la virgule interne ne coupe pas la liste", () => {
    expect(parseCaptures("docs/screenshots/texte-en-colonnes/{dialogue,resultat}-{clair,sombre}.png").paths).toHaveLength(4);
    expect(parseCaptures("docs/s/{a,b}.png, docs/s/c.png").paths).toEqual(["docs/s/a.png", "docs/s/b.png", "docs/s/c.png"]);
  });
  it("« sans objet (...) »: exemption explicite, aucun chemin", () => {
    expect(parseCaptures("sans objet (aucun effet visible nouveau)")).toEqual({ paths: [], exempt: true });
    expect(parseCaptures("Sans objet")).toMatchObject({ exempt: true });
  });
  it("notes entre parentheses (meme avec des virgules) et texte libre ignores", () => {
    expect(parseCaptures("docs/s/a.png (import CSV non capturé, couvert en unitaire), docs/s/b.png").paths).toEqual(["docs/s/a.png", "docs/s/b.png"]);
    expect(parseCaptures("voir les tests").paths).toEqual([]);
  });
});
describe("rapport complet", () => {
  const md = (caps: string) => `# Rapport : x\nStatut : termine\nVisible : oui\n\n## Fait\n- ok\n\n## Preuves\n- Tests : ok (12)\n- Captures : ${caps}\n`;
  it("accolades developpees puis verifiees une a une par le code", () => {
    const r = parseReport(md("docs/s/{a,b}-{clair,sombre}.png"));
    expect(r.screenshots).toHaveLength(4);
    const have = new Set(r.screenshots);
    expect(validateReport(r, (p) => have.has(p)).ok).toBe(true);
    const v = validateReport(r, (p) => !p.includes("b-sombre"));
    expect(v.missing).toEqual(["capture absente : docs/s/b-sombre.png"]);
  });
  it("sans objet: plus besoin de captures, meme avec Visible : oui", () => {
    const r = parseReport(md("sans objet (aucun effet visible nouveau)"));
    expect(r.visible).toBe(false);
    expect(validateReport(r, () => false)).toEqual({ ok: true, missing: [] });
  });
});
