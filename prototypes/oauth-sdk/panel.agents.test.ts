// @vitest-environment jsdom
/** Panneau: agents d'implementation en parallele (une ligne par carte, phase en cours tant qu'un agent travaille). */
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
const rows = () => [...document.querySelectorAll("#phasebar li.agent")].filter((li) => li.closest(".par"));
const phase = () => [...document.querySelectorAll("#phasebar > li")].find((li) => /Implémentation/.test(li.textContent ?? ""))!;

describe("agents en parallele", () => {
  it("une ligne par agent (carte), en cours puis reussi/echec selon sa fusion, avec cout", () => {
    const send = load();
    send({ type: "start", sector: "implementation", agent: "graphe" });
    send({ type: "start", sector: "implementation", agent: "filtre" });
    expect(rows().map((r) => r.textContent)).toEqual([expect.stringContaining("graphe"), expect.stringContaining("filtre")]);
    expect(rows().every((r) => r.classList.contains("running"))).toBe(true);
    send({ type: "end", sector: "implementation", agent: "graphe", ok: true, costUsd: 0.54, elapsedS: 40 });
    send({ type: "end", sector: "implementation", agent: "filtre", ok: false, elapsedS: 50 });
    expect(rows()[0].classList.contains("ok")).toBe(true);
    expect(rows()[0].textContent).toContain("0,50 €");
    expect(rows()[1].classList.contains("fail")).toBe(true);
  });
  it("la phase reste en cours tant qu'un agent travaille, puis passe a reussi si tous ont fusionne", () => {
    const send = load();
    send({ type: "start", sector: "implementation", agent: "a" });
    send({ type: "start", sector: "implementation", agent: "b" });
    send({ type: "end", sector: "implementation", agent: "a", ok: true });
    expect(phase().classList.contains("running")).toBe(true);
    send({ type: "end", sector: "implementation", agent: "b", ok: true });
    expect(phase().classList.contains("ok")).toBe(true);
  });
  it("titre de la liste: nombre d'agents simultanes", () => {
    const send = load();
    send({ type: "start", sector: "implementation", agent: "a" });
    send({ type: "start", sector: "implementation", agent: "b" });
    expect(phase().querySelector(".par")!.textContent).toMatch(/2 agents en parallèle/);
  });
  it("sans agent (un seul agent pour le lot): aucune liste", () => {
    const send = load();
    send({ type: "start", sector: "implementation" });
    expect(document.querySelector(".par")).toBeNull();
  });
});
