// @vitest-environment jsdom
/** Journal du panneau: les evenements `card` repetes sont regroupes par carte (id lisible, compteur), l'heure vient du serveur. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (f: string) => readFileSync(join(__dirname, f), "utf8");
function load() {
  let push: (e: object) => void = () => {};
  const g = globalThis as Record<string, unknown>;
  g.fetch = async () => ({ ok: true, json: async () => ({}) });
  g.EventSource = class { set onmessage(f: (m: { data: string }) => void) { push = (e) => f({ data: JSON.stringify(e) }); } set onopen(_: () => void) {} set onerror(_: () => void) {} };
  document.documentElement.innerHTML = read("panel.html").replace(/^[\s\S]*?<html[^>]*>/i, "");
  new Function(read("panel.js"))();
  return (e: object) => push(e);
}
const lines = () => [...document.querySelectorAll("#log li")].map((li) => li.textContent ?? "");

describe("journal: evenements de carte", () => {
  it("50 evenements pour 2 cartes: 2 lignes lisibles (id, compteur), pas 50", () => {
    const send = load();
    for (let i = 0; i < 25; i++) { send({ type: "card", sector: "implementation", cardId: "texte-en-colonnes" }); send({ type: "card", sector: "implementation", cardId: "plafonds" }); }
    const l = lines();
    expect(l).toHaveLength(2);
    expect(l[0]).toContain("carte");
    expect(l[0]).toContain("texte-en-colonnes");
    expect(l[0]).toContain("×25");
    expect(l[1]).toContain("plafonds");
  });
  it("une autre ligne entre deux evenements d'une meme carte la rouvre (ordre du journal preserve)", () => {
    const send = load();
    send({ type: "card", cardId: "a" }); send({ type: "info", message: "fusion" }); send({ type: "card", cardId: "a" });
    expect(lines()).toHaveLength(3);
  });
  it("l'heure affichee est celle du serveur (`ts`), pas celle de l'arrivee (rejeu a la connexion)", () => {
    const send = load();
    send({ type: "info", message: "x", ts: Date.UTC(2020, 0, 1, 10, 20, 30) });
    const t = document.querySelector("#log li time")!.textContent!;
    expect(t).not.toBe("");
    expect(new Date(Date.UTC(2020, 0, 1, 10, 20, 30)).toLocaleTimeString("fr-FR")).toContain(t.slice(0, 5));
  });
});
