// @vitest-environment jsdom
/** Tests de la page moodboard : colonnes par etat, recherche/filtre, rapport en direct dans le tiroir, progression. */
import { flush } from "./testUtil";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (f: string) => readFileSync(join(__dirname, f), "utf8");
const html = read("moodboard.html"), css = read("moodboard-view.css"), js = read("moodboard-view.js");
const C = (id: string, state: string, extra: object = {}) => ({ id, title: `Titre ${id}`, state, status: "found", axis: "new", summary: `sum ${id}`, source: "src", missing: [], ...extra });
const CARDS = [C("a", "idee"), C("b", "piste", { axis: "poor" }), C("c", "en-cours"), C("d", "preuves", { missing: ["captures"] }), C("e", "termine"), C("f", "bloque")];
const REPORT = (id: string, over: object = {}) => ({
  id, state: "en-cours", missing: [], markdown: "# R",
  report: { title: `Titre ${id}`, status: "en-cours", visible: true, done: ["fait un"], todo: ["reste un"], tests: "ok (12)", screenshots: ["docs/screenshots/x/a-clair.png"], decisions: ["choix un"] }, ...over,
});

/** Charge la page avec fetch/EventSource factices; `reports` donne le rapport (ou null) par id. */
async function load(cards: unknown[], reports: Record<string, unknown> = {}) {
  const g = globalThis as Record<string, unknown>;
  const hits: string[] = [];
  const handlers: ((e: { data: string }) => void)[] = [];
  g.fetch = async (u: string) => {
    hits.push(u);
    if (u.startsWith("/reports/")) { const r = reports[u.slice(9)]; return { ok: !!r, json: async () => r }; }
    return { ok: true, json: async () => cards };
  };
  g.EventSource = class { addEventListener(_t: string, f: (e: { data: string }) => void) { handlers.push(f); } };
  document.documentElement.innerHTML = html.replace(/^[\s\S]*?<html[^>]*>/i, "");
  new Function(js)();
  await flush();
  return { hits, emit: (o: object) => handlers.forEach((f) => f({ data: JSON.stringify(o) })) };
}
const n = (id: string) => document.querySelectorAll(`#${id} .card`).length;
const tick = (_ms?: number) => flush();

describe("moodboard: fichiers", () => {
  it("<= 201 lignes chacun, nav commune, sombre, ids stables", () => {
    for (const t of [html, css, js]) expect(t.split("\n").length).toBeLessThanOrEqual(201);
    expect(html).toContain('href="/panel.css"');
    expect(html).toContain('href="/moodboard-view.css"');
    expect(css).toContain("--c-dep-in"); // jetons de l'app (clair + sombre via theme-dark.css)
    for (const id of ["board", "col-idee", "col-en-cours", "col-preuves", "col-termine", "drawer", "q", "progress", "counters"]) expect(html).toContain(`id="${id}"`);
  });
});

describe("moodboard: anomalies du reconciliateur", () => {
  it("pastille sur la carte (premiere anomalie) et compteur dans l'en-tete; rien sans anomalie", async () => {
    await load([C("a", "idee", { anomalies: ["orpheline : rapport en cours sans agent actif"] }), C("b", "preuves", { missing: ["rapport"], anomalies: ["finie (TODO coche) sans rapport : rapport a ecrire"] }), C("c", "idee")]);
    expect(document.querySelector(".card[data-id=a] .anom")!.textContent).toContain("orpheline");
    expect(document.querySelector(".card[data-id=b] .anom")!.textContent).toContain("sans rapport");
    expect(document.querySelector(".card[data-id=c] .anom")).toBeNull();
    expect(document.getElementById("counters")!.textContent).toMatch(/Anomalies\s*2/);
  });
  it("aucun compteur d'anomalies quand tout est coherent", async () => {
    await load([C("a", "idee")]);
    expect(document.getElementById("counters")!.textContent).not.toMatch(/Anomalies/);
  });
});

describe("moodboard: rendu", () => {
  it("range les cartes par etat (piste avec les idees, bloque avec les en cours) et compte", async () => {
    await load(CARDS);
    expect([n("col-idee"), n("col-en-cours"), n("col-preuves"), n("col-termine")]).toEqual([2, 2, 1, 1]);
    expect(document.querySelector("#col-idee .card[data-id=b]")!.textContent).toContain("piste");
    expect(document.querySelector("#col-en-cours .card[data-id=f]")!.textContent).toContain("bloqué");
    expect(document.querySelector("#col-preuves .card")!.textContent).toContain("captures");
    expect(document.getElementById("progress")!.textContent).toContain("1 / 6");
  });
  it("recherche texte et filtre d'axe", async () => {
    await load(CARDS);
    const q = document.getElementById("q") as HTMLInputElement;
    q.value = "titre c"; q.dispatchEvent(new Event("input"));
    expect(document.querySelectorAll(".card").length).toBe(1);
    q.value = ""; q.dispatchEvent(new Event("input"));
    (document.querySelector('.axis-chip[data-axis="poor"]') as HTMLElement).click();
    expect(document.querySelectorAll(".card").length).toBe(1);
  });
  it("etat vide", async () => {
    await load([]);
    expect(document.querySelectorAll("#col-idee .empty").length).toBe(1);
  });
});

describe("moodboard: rapport en direct", () => {
  it("clic sur une carte: tiroir avec fait, non fait, preuves, captures, decisions", async () => {
    await load(CARDS, { c: REPORT("c") });
    (document.querySelector(".card[data-id=c]") as HTMLElement).click();
    await tick();
    const d = document.getElementById("drawer")!;
    expect(d.hidden).toBe(false);
    for (const t of ["fait un", "reste un", "ok (12)", "choix un"]) expect(d.textContent).toContain(t);
    expect(d.querySelector('img[src="/shots/docs/screenshots/x/a-clair.png"]')).toBeTruthy();
    expect(document.querySelector(".card[data-id=c]")!.getAttribute("aria-expanded")).toBe("true");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(d.hidden).toBe(true);
  });
  it("carte sans rapport: le dit, sans erreur", async () => {
    await load(CARDS, {});
    (document.querySelector(".card[data-id=a]") as HTMLElement).click();
    await tick();
    expect(document.getElementById("drawer")!.textContent).toMatch(/pas encore de rapport/i);
  });
  it("evenement `card` de la carte ouverte: rapport relu; autre carte: rien", async () => {
    const h = await load(CARDS, { c: REPORT("c") });
    (document.querySelector(".card[data-id=c]") as HTMLElement).click();
    await tick();
    const base = h.hits.filter((u) => u === "/reports/c").length;
    h.emit({ type: "card", cardId: "zz" });
    h.emit({ type: "card", cardId: "c" });
    await tick();
    expect(h.hits.filter((u) => u === "/reports/c").length).toBe(base + 1);
    expect(h.hits).not.toContain("/reports/zz");
  });
  it("preuves manquantes affichees dans le tiroir", async () => {
    await load(CARDS, { d: REPORT("d", { state: "preuves", missing: ["captures"] }) });
    (document.querySelector(".card[data-id=d]") as HTMLElement).click();
    await tick();
    expect(document.getElementById("drawer")!.textContent).toContain("Preuves manquantes");
  });
});

describe("moodboard: fin de boucle", () => {
  it("done complete: bandeau termine; done incomplet: non termine", async () => {
    const h = await load(CARDS);
    h.emit({ type: "done", complete: true });
    expect(document.getElementById("progress")!.textContent).toContain("Boucle terminée");
    h.emit({ type: "done", complete: false });
    expect(document.getElementById("progress")!.textContent).toContain("Boucle non terminée");
  });
  it("echec du chargement: message de nouvelle tentative, pas 'Aucune carte'", async () => {
    const g = globalThis as Record<string, unknown>;
    g.fetch = async () => { throw new Error("down"); };
    g.EventSource = class { addEventListener() {} };
    document.documentElement.innerHTML = html.replace(/^[\s\S]*?<html[^>]*>/i, "");
    new Function(js)();
    await flush();
    const err = document.getElementById("loaderr")!;
    expect(err.textContent).toMatch(/Impossible de charger.*Réessayer/s);
    expect(document.querySelectorAll(".empty").length).toBe(0);
    g.fetch = async () => ({ ok: true, json: async () => CARDS });
    (err.querySelector("button") as HTMLElement).click();
    await flush();
    expect(document.getElementById("loaderr")).toBeNull();
    expect(document.querySelectorAll(".card").length).toBe(6);
  });
});
