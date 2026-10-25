/** Tests du rapport d'une carte: analyse, preuves exigees, etat de la carte. */
import { describe, expect, it } from "vitest";
import { cardState, parseReport, validateReport, reportTemplate } from "./card";

const GOOD = `# Rapport : Tri multi-colonnes
Statut : termine
Visible : oui

## Fait
- Tri sur 2 colonnes
- Test ecrit en premier : src/engine/sort.test.ts

## Non fait
- aucun

## Preuves
- Tests : npm test -> OK (412 tests)
- Captures : docs/screenshots/tri/clair.png, docs/screenshots/tri/sombre.png

## Decisions
- Tri stable ou non ? -> stable (trancheur)
`;

describe("parseReport", () => {
  it("lit statut, visibilite, sections et captures", () => {
    const r = parseReport(GOOD);
    expect(r.title).toBe("Tri multi-colonnes");
    expect(r.status).toBe("termine");
    expect(r.visible).toBe(true);
    expect(r.done).toEqual(["Tri sur 2 colonnes", "Test ecrit en premier : src/engine/sort.test.ts"]);
    expect(r.todo).toEqual(["aucun"]);
    expect(r.tests).toBe("npm test -> OK (412 tests)");
    expect(r.screenshots).toEqual(["docs/screenshots/tri/clair.png", "docs/screenshots/tri/sombre.png"]);
    expect(r.decisions).toEqual(["Tri stable ou non ? -> stable (trancheur)"]);
  });
  it("tolere un rapport vide ou inconnu", () => {
    const r = parseReport("n'importe quoi");
    expect(r.status).toBe("en-cours");
    expect(r.done).toEqual([]);
    expect(r.screenshots).toEqual([]);
  });
});

describe("parseReport CRLF", () => {
  it("un rapport en CRLF (checkout Windows) donne le meme resultat", () => {
    expect(parseReport(GOOD.replace(/\n/g, "\r\n"))).toEqual(parseReport(GOOD));
  });
});

describe("validateReport", () => {
  const exists = () => true;
  it("termine + preuves completes -> ok", () => {
    expect(validateReport(parseReport(GOOD), exists)).toEqual({ ok: true, missing: [] });
  });
  it("liste ce qui manque", () => {
    const r = parseReport("# Rapport : x\nStatut : termine\nVisible : oui\n## Fait\n\n## Preuves\n");
    const v = validateReport(r, () => false);
    expect(v.ok).toBe(false);
    expect(v.missing).toEqual(expect.arrayContaining(["fait", "tests", "captures"]));
  });
  it("capture declaree mais fichier absent", () => {
    const v = validateReport(parseReport(GOOD), (p) => !p.endsWith("sombre.png"));
    expect(v.missing).toEqual(["capture absente : docs/screenshots/tri/sombre.png"]);
  });
  it("visible: non dispense des captures mais pas des tests", () => {
    const md = GOOD.replace("Visible : oui", "Visible : non").replace(/- Captures.*\n/, "");
    expect(validateReport(parseReport(md), exists).ok).toBe(true);
    expect(validateReport(parseReport(md.replace(/- Tests.*\n/, "")), exists).missing).toEqual(["tests"]);
  });
  it("un rapport en cours n'exige rien", () => {
    expect(validateReport(parseReport("Statut : en-cours"), () => false).ok).toBe(true);
  });
});

describe("cardState", () => {
  it("idee sans rapport, piste si marquee", () => {
    expect(cardState(undefined, false)).toBe("idee");
    expect(cardState(undefined, true)).toBe("piste");
  });
  it("en cours, bloque", () => {
    expect(cardState(parseReport("Statut : en-cours"), false)).toBe("en-cours");
    expect(cardState(parseReport("Statut : bloque"), false)).toBe("bloque");
  });
  it("termine declare mais preuves manquantes -> preuves; complet -> termine", () => {
    const bad = parseReport("Statut : termine\nVisible : non");
    expect(cardState(bad, false, validateReport(bad, () => true))).toBe("preuves");
    expect(cardState(parseReport(GOOD), false, { ok: true, missing: [] })).toBe("termine");
  });
});

describe("reportTemplate", () => {
  it("gabarit que le parseur relit: en cours, sections vides", () => {
    const r = parseReport(reportTemplate("Mon idee"));
    expect(r.title).toBe("Mon idee");
    expect(r.status).toBe("en-cours");
  });
});
