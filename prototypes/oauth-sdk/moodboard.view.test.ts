// @vitest-environment jsdom
/** Tests de la page moodboard.html : structure, theme sombre, rendu des cartes. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const html = readFileSync(join(__dirname, "moodboard.html"), "utf8");
const CARDS = [
  { id: "a", title: "A", status: "found", axis: "new", summary: "s", source: "x" },
  { id: "b", title: "B", status: "developing", axis: "poor", summary: "s", source: "y" },
  { id: "c", title: "C", status: "lead", summary: "s", source: "z" },
  { id: "d", title: "D", status: "lead", axis: "new", summary: "s", source: "z" },
];

/** Charge la page dans jsdom avec fetch/EventSource factices. */
async function load(cards: unknown[]) {
  const g = globalThis as Record<string, unknown>;
  g.fetch = async () => ({ ok: true, json: async () => cards });
  g.EventSource = class { addEventListener() {} };
  document.documentElement.innerHTML = html.replace(/^[\s\S]*?<html[^>]*>/i, "");
  const code = [...document.querySelectorAll("script")].map((s) => s.textContent).join("\n");
  new Function(code)();
  await new Promise((r) => setTimeout(r, 10));
}

describe("moodboard.html", () => {
  it("<= 200 lignes, theme sombre, ids stables", () => {
    expect(html.split("\n").length).toBeLessThanOrEqual(200);
    expect(html).toContain("prefers-color-scheme: dark");
    for (const id of ["board", "col-found", "col-developing", "col-lead"]) expect(html).toContain(`id="${id}"`);
  });
  it("range les cartes dans la bonne colonne", async () => {
    await load(CARDS);
    const n = (id: string) => document.querySelectorAll(`#${id} .card`).length;
    expect([n("col-found"), n("col-developing"), n("col-lead")]).toEqual([1, 1, 2]);
    expect(document.querySelector("#col-developing .card")!.textContent).toContain("B");
  });
  it("chips d'axe (texte) et filtre", async () => {
    await load(CARDS);
    expect(document.querySelectorAll(".axis-chip").length).toBeGreaterThanOrEqual(4);
    (document.querySelector('.axis-chip[data-axis="new"]') as HTMLElement).click();
    expect(document.querySelectorAll(".card").length).toBe(2);
  });
  it("etat vide", async () => {
    await load([]);
    expect(document.querySelectorAll("#col-found .empty").length).toBe(1);
  });
  it("echec du chargement: message de nouvelle tentative, pas 'Aucune carte'", async () => {
    const g = globalThis as Record<string, unknown>;
    g.fetch = async () => { throw new Error("down"); };
    g.EventSource = class { addEventListener() {} };
    document.documentElement.innerHTML = html.replace(/^[\s\S]*?<html[^>]*>/i, "");
    new Function([...document.querySelectorAll("script")].map((s) => s.textContent).join("\n"))();
    await new Promise((r) => setTimeout(r, 10));
    const err = document.getElementById("loaderr")!;
    expect(err.textContent).toMatch(/Impossible de charger.*Réessayer/s);
    expect(document.querySelectorAll(".empty").length).toBe(0);
    g.fetch = async () => ({ ok: true, json: async () => CARDS });
    (err.querySelector("button") as HTMLElement).click();
    await new Promise((r) => setTimeout(r, 10));
    expect(document.getElementById("loaderr")).toBeNull();
    expect(document.querySelectorAll(".card").length).toBe(4);
  });
});
