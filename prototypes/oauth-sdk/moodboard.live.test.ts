// @vitest-environment jsdom
/** Moodboard en temps reel: evenement SSE -> ecran sans delai (horloge figee), agents actifs, fraicheur, reprise apres coupure. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const read = (f: string) => readFileSync(join(__dirname, f), "utf8");
const html = read("moodboard.html"), js = read("moodboard-view.js");
const C = (id: string, state: string, extra: object = {}) => ({ id, title: `Titre ${id}`, state, status: "found", axis: "new", summary: "", source: "", missing: [], anomalies: [], ...extra });

/** Page avec fetch/EventSource factices; `board` est relu par chaque GET /moodboard. Horloge figee: aucun delai ne peut jouer. */
async function load(board: { cards: unknown[] }) {
  const g = globalThis as Record<string, unknown>;
  const hits: string[] = [];
  const msg: ((e: { data: string }) => void)[] = [];
  const open: (() => void)[] = [], fail: (() => void)[] = [];
  g.fetch = async (u: string) => { hits.push(u); return { ok: true, json: async () => structuredClone(board.cards) }; };
  g.EventSource = class {
    addEventListener(t: string, f: never) { if (t === "message") msg.push(f); if (t === "open") open.push(f); if (t === "error") fail.push(f); }
  };
  document.documentElement.innerHTML = html.replace(/^[\s\S]*?<html[^>]*>/i, "");
  new Function(js)();
  await vi.advanceTimersByTimeAsync(0);
  return {
    hits,
    emit: async (o: object) => { msg.forEach((f) => f({ data: JSON.stringify(o) })); await vi.advanceTimersByTimeAsync(0); },
    connect: async (up: boolean) => { (up ? open : fail).forEach((f) => f()); await vi.advanceTimersByTimeAsync(0); },
  };
}
const n = (id: string) => document.querySelectorAll(`#${id} .card`).length;
const ids = (col: string) => [...document.querySelectorAll(`#${col} .card`)].map((c) => (c as HTMLElement).dataset.id);

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("moodboard temps reel", () => {
  it("evenement `card`: la carte change de colonne sans attendre (zero ms d'horloge, plus de limite a 3 s)", async () => {
    const board = { cards: [C("a", "idee")] };
    const p = await load(board);
    expect(ids("col-idee")).toEqual(["a"]);
    board.cards = [C("a", "en-cours")];
    await p.emit({ type: "card", cardId: "a" });
    expect(ids("col-en-cours")).toEqual(["a"]);
    board.cards = [C("a", "termine")];
    await p.emit({ type: "card", cardId: "a" }); // 2e evenement immediat: pas de 3 s a attendre
    expect(ids("col-termine")).toEqual(["a"]);
  });
  it("rafale d'evenements: un seul GET en vol a la fois, puis un dernier pour rattraper", async () => {
    const board = { cards: [C("a", "idee")] };
    const p = await load(board);
    const before = p.hits.length;
    board.cards = [C("a", "preuves")];
    for (let i = 0; i < 20; i++) await p.emit({ type: "card", cardId: "a" });
    expect(ids("col-preuves")).toEqual(["a"]);
    expect(p.hits.length - before).toBeLessThanOrEqual(21);
  });
  it("carte vue par un agent mais pas encore reclassee: marquee en cours tout de suite (optimiste), la reponse du serveur fait foi", async () => {
    const board = { cards: [C("a", "idee")] };
    let release = () => {};
    const g = globalThis as Record<string, unknown>;
    const p = await load(board);
    g.fetch = () => new Promise((r) => { release = () => r({ ok: true, json: async () => structuredClone(board.cards) }); });
    await p.emit({ type: "card", cardId: "a" });
    expect(ids("col-en-cours")).toEqual(["a"]);
    release(); await vi.advanceTimersByTimeAsync(0);
    expect(ids("col-idee")).toEqual(["a"]);
  });
  it("agents paralleles: pastille « agent » sur chaque carte traitee, retiree a la fin de l'agent", async () => {
    const p = await load({ cards: [C("a", "en-cours"), C("b", "en-cours"), C("c", "idee")] });
    await p.emit({ type: "start", sector: "implementation", agent: "a, b" });
    expect(document.querySelector(".card[data-id=a] .agent")).not.toBeNull();
    expect(document.querySelector(".card[data-id=b] .agent")).not.toBeNull();
    expect(document.querySelector(".card[data-id=c] .agent")).toBeNull();
    await p.emit({ type: "end", sector: "implementation", agent: "a, b", ok: true });
    expect(document.querySelector(".agent")).toBeNull();
  });
  it("pastille seulement sur une carte « en cours »: plus rien des qu'elle passe en preuves ou terminee", async () => {
    const board = { cards: [C("a", "en-cours")] };
    const p = await load(board);
    await p.emit({ type: "start", sector: "implementation", agent: "a" });
    expect(document.querySelector(".agent")).not.toBeNull();
    board.cards = [C("a", "termine")];
    await p.emit({ type: "card", cardId: "a" }); // rapport ecrit apres la fin de l'agent
    expect(document.querySelector(".agent")).toBeNull();
  });
  it("fin de boucle: plus aucun agent actif", async () => {
    const p = await load({ cards: [C("a", "en-cours")] });
    await p.emit({ type: "start", sector: "implementation", agent: "a" });
    await p.emit({ type: "done", complete: false });
    expect(document.querySelector(".agent")).toBeNull();
  });
  it("fraicheur: « mis a jour il y a Xs » avance chaque seconde et repart a 0 apres un chargement", async () => {
    const p = await load({ cards: [C("a", "idee")] });
    const t = () => document.getElementById("fresh")!.textContent;
    expect(t()).toMatch(/à l'instant|0 s/);
    await vi.advanceTimersByTimeAsync(5000);
    expect(t()).toMatch(/il y a [45] s/);
    await p.emit({ type: "card", cardId: "a" });
    expect(t()).toMatch(/à l'instant|0 s/);
  });
  it("connexion: « en direct » / « reconnexion… », et rechargement complet a la reconnexion (rien de perdu)", async () => {
    const p = await load({ cards: [C("a", "idee")] });
    await p.connect(true);
    expect(document.getElementById("live")!.textContent).toMatch(/en direct/);
    await p.connect(false);
    expect(document.getElementById("live")!.textContent).toMatch(/reconnexion/);
    const before = p.hits.length;
    await p.connect(true);
    expect(p.hits.length).toBeGreaterThan(before);
    expect(document.getElementById("live")!.textContent).toMatch(/en direct/);
  });
});

describe("moodboard: aucune carte perdue ni doublee", () => {
  it("chaque carte est dans exactement une colonne, les compteurs somment au total", async () => {
    const states = ["idee", "piste", "en-cours", "bloque", "preuves", "termine"];
    const cards = Array.from({ length: 60 }, (_, i) => C(`c${i}`, states[i % states.length]));
    await load({ cards });
    const all = ["col-idee", "col-en-cours", "col-preuves", "col-termine"].flatMap(ids);
    expect(all).toHaveLength(60);
    expect(new Set(all).size).toBe(60);
    const sum = [...document.querySelectorAll("#counters .count b")].slice(0, 4).reduce((a, b) => a + Number(b.textContent), 0);
    expect(sum).toBe(60);
  });
});
