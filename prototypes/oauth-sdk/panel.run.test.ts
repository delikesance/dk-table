// @vitest-environment jsdom
/** Panneau: un run a sa propre vie (reprise a zero, agents reessayes, arret visible). */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (f: string) => readFileSync(join(__dirname, f), "utf8");

function load() {
  let push: (e: object, id?: string) => void = () => {};
  const g = globalThis as Record<string, unknown>;
  g.fetch = async () => ({ ok: true, json: async () => ({}) });
  g.EventSource = class { set onmessage(f: (m: { data: string; lastEventId: string }) => void) { push = (e, id = "") => f({ data: JSON.stringify(e), lastEventId: id }); } set onopen(_: () => void) {} set onerror(_: () => void) {} };
  document.documentElement.innerHTML = read("panel.html").replace(/^[\s\S]*?<html[^>]*>/i, "");
  new Function(read("panel.js"))();
  return (e: object, id?: string) => push(e, id);
}
const phase = (re: RegExp) => [...document.querySelectorAll("#phasebar > li")].find((li) => re.test(li.textContent ?? ""))!;
const agents = () => [...document.querySelectorAll("#phasebar .par li.agent")];

describe("agent en echec puis reessaye (conflit de fusion)", () => {
  it("l'agent echoue est remplace par celui qui reprend ses cartes: la phase finit reussie", () => {
    const send = load();
    for (const a of ["a", "b", "c"]) send({ type: "start", sector: "implementation", agent: a });
    send({ type: "end", sector: "implementation", agent: "a", ok: true });
    send({ type: "end", sector: "implementation", agent: "b", ok: false });
    send({ type: "end", sector: "implementation", agent: "c", ok: false });
    send({ type: "start", sector: "implementation", agent: "b, c" }); // reprise en serie
    expect(agents().map((x) => x.textContent?.replace(/\s+/g, " "))).toEqual([expect.stringContaining("a"), expect.stringContaining("b, c")]);
    send({ type: "end", sector: "implementation", agent: "b, c", ok: true });
    expect(phase(/Implémentation/).classList.contains("ok")).toBe(true);
    expect(document.querySelectorAll("#phasebar li.agent.fail").length).toBe(0);
  });
  it("un agent echoue qui n'est jamais repris reste un echec", () => {
    const send = load();
    send({ type: "start", sector: "implementation", agent: "a" });
    send({ type: "end", sector: "implementation", agent: "a", ok: false });
    expect(phase(/Implémentation/).classList.contains("fail")).toBe(true);
  });
});

describe("nouveau run", () => {
  it("le premier evenement apres « terminé » remet phases, couts, resumes et journal a zero", () => {
    const send = load();
    send({ type: "start", sector: "design" });
    send({ type: "end", sector: "design", costUsd: 1.08, totalUsd: 1.08, ok: true });
    send({ type: "summary", phase: "design", message: "premier" });
    send({ type: "done", message: "terminé" });
    expect(phase(/Design/).textContent).toContain("1,00 €");
    send({ type: "start", sector: "research" });
    expect(phase(/Design/).classList.contains("pending")).toBe(true);
    expect(phase(/Design/).textContent).not.toContain("€");
    expect(document.querySelectorAll("#log li").length).toBe(1);
    send({ type: "end", sector: "design", costUsd: 1.08, ok: true });
    expect(phase(/Design/).textContent).toContain("1,00 €"); // pas 2,00 €
    expect(document.querySelector<HTMLElement>("#history")!.hidden).toBe(true);
  });
});

describe("arret", () => {
  it("Stop affiche tout de suite « Arrêt en cours » et bloque un second clic jusqu'a la fin", async () => {
    const send = load();
    send({ type: "start", sector: "design" });
    const run = document.querySelector<HTMLButtonElement>("#run")!;
    run.click();
    expect(document.querySelector("#status")!.textContent).toMatch(/Arrêt en cours/);
    expect(run.disabled).toBe(true);
    send({ type: "info", message: "arrete" });
    expect(run.disabled).toBe(true);
    send({ type: "done", message: "arrêté" });
    expect(run.disabled).toBe(false);
    expect(document.querySelector("#status")!.textContent).toMatch(/^Arrêté/);
  });
});

describe("coupure du flux", () => {
  it("un autre numero de run (nouveau run demarre pendant la coupure, « terminé » manque) remet le panneau a zero", () => {
    const send = load();
    send({ type: "end", sector: "design", costUsd: 1.08, ok: true }, "1-0");
    send({ type: "end", sector: "design", costUsd: 1.08, ok: true }, "1-1"); // meme run: s'additionne
    expect(phase(/Design/).textContent).toContain("2,00 €");
    send({ type: "start", sector: "research" }, "2-0"); // le run 1 n'a jamais envoye `done` ici
    expect(phase(/Design/).classList.contains("pending")).toBe(true);
    expect(document.querySelectorAll("#log li").length).toBe(1);
  });
});
