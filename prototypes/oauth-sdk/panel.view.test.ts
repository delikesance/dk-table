// @vitest-environment jsdom
/** Tests du panneau Boucle : nav commune, reperes stables, contraste, rendu des evenements. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (f: string) => readFileSync(join(__dirname, f), "utf8");
const html = read("panel.html"), css = read("panel.css"), js = read("panel.js");

/** Charge panel.html + panel.js dans jsdom; renvoie une fonction d'envoi d'evenements SSE. */
function load() {
  let push: (e: object) => void = () => {};
  let open: () => void = () => {}, fail: () => void = () => {};
  const g = globalThis as Record<string, unknown>;
  g.fetch = async () => ({ ok: true, json: async () => ({}) });
  g.EventSource = class {
    set onmessage(f: (m: { data: string }) => void) { push = (e) => f({ data: JSON.stringify(e) }); }
    set onopen(f: () => void) { open = f; }
    set onerror(f: () => void) { fail = f; }
  };
  document.documentElement.innerHTML = html.replace(/^[\s\S]*?<html[^>]*>/i, "");
  new Function(js)();
  const send = (e: object) => push(e);
  return Object.assign(send, { open: () => open(), fail: () => fail() });
}
const q = (s: string) => document.querySelector(s);

describe("panneau: fichiers", () => {
  it("<= 200 lignes chacun", () => {
    for (const t of [html, css, js]) expect(t.split("\n").length).toBeLessThanOrEqual(201);
  });
  it("nav Boucle/Moodboard/Design + panel.css dans les 3 pages", () => {
    for (const f of ["panel.html", "moodboard.html", "design.html"]) {
      const t = read(f);
      expect(t, f).toContain('class="topnav"');
      expect(t, f).toContain('href="/panel.css"');
      for (const h of ['href="/"', 'href="/moodboard.html"', 'href="/design.html"']) expect(t, f).toContain(h);
    }
    expect(html).toContain('aria-current="page"');
  });
  it("jetons de contraste clair + sombre, focus, 4 etats", () => {
    expect(css).toContain("prefers-color-scheme: dark");
    for (const t of ["--fg", "--mut", "--acc", "--on-acc", "--ok", "--fail", ":focus-visible"]) expect(css).toContain(t);
    for (const s of ["pending", "running", "ok", "fail"]) expect(css).toContain(`.${s}`);
  });
  it("reperes stables", () => {
    for (const id of ["summary", "phasebar", "budget", "journal", "run", "budgetEur", "gauge", "idle", "alert", "conn", "onlyErr", "log"]) {
      expect(html).toContain(`id="${id}"`);
    }
  });
});

describe("panneau: rendu", () => {
  it("etat initial: explication, jauge 0 / budget, 4 etapes, cartes en attente", () => {
    load();
    expect(q("#idle")!.textContent).toMatch(/recherche.*implémentation.*correction.*design/s);
    expect(q("#amounts")!.textContent).toContain("0,00 €");
    expect(q("#amounts")!.textContent).not.toContain("-");
    expect(document.querySelectorAll("#phasebar .step").length).toBe(4);
    expect(q("#phasebar .agent.pending")).toBeTruthy();
    expect((q("#run") as HTMLButtonElement).disabled).toBe(false);
    expect(q("#run")!.textContent).toBe("Go");
    expect(q("#alert")!.hasAttribute("hidden")).toBe(true);
    expect(q("#conn")!.hasAttribute("hidden")).toBe(true);
  });
  it("libelles lisibles des axes", () => {
    load();
    const t = q("#phasebar")!.textContent!;
    for (const l of ["Idées nouvelles", "Fonctions manquantes", "Boudées", "Mal conçues"]) expect(t).toContain(l);
  });
  it("evenements: running, ok, fail, budget, resume, journal", () => {
    const send = load();
    send({ type: "start", sector: "research", axis: "nouveau" });
    expect(q("#phasebar .agent.running")!.textContent).toContain("en cours");
    expect(q("#phasebar .agent.running")!.textContent).not.toContain("0 s");
    expect(q("#run")!.textContent).toBe("Stop");
    expect(q("#run")!.getAttribute("data-state")).toBe("running");
    expect(q("#idle")).toBeNull();
    send({ type: "end", sector: "research", axis: "nouveau", totalUsd: 1.08, remainingUsd: 20.52 });
    send({ type: "end", sector: "research", axis: "mal", ok: false });
    expect(q("#phasebar .agent.ok")!.textContent).toContain("réussi");
    expect(q("#phasebar .agent.fail")!.textContent).toContain("échec");
    expect(q("#amounts")!.textContent).toBe("1,00 € sur 20 €");
    send({ type: "summary", phase: "research", message: "Premier résumé." });
    send({ type: "summary", phase: "implementation", message: "Second résumé." });
    expect(q("#latest")!.textContent).toBe("Second résumé.");
    expect(q("#hist")!.textContent).toContain("Premier résumé.");
    send({ type: "done", message: "fini" });
    expect(q("#run")!.textContent).toBe("Go");
  });
  it("erreur: bandeau persistant, ligne rouge au journal, effacee au prochain Go", () => {
    const send = load();
    send({ type: "start", sector: "research", axis: "mal" });
    send({ type: "error", sector: "research", axis: "mal", message: "boum" });
    expect(q("#alert")!.hasAttribute("hidden")).toBe(false);
    expect(q("#alert")!.getAttribute("role")).toBe("alert");
    expect(q("#alert")!.textContent).toContain("boum");
    expect(q("#phasebar .agent.fail")).toBeTruthy();
    expect(q("#log li.error")).toBeTruthy();
    send({ type: "done", message: "terminé" });
    expect(q("#alert")!.hasAttribute("hidden")).toBe(false);
    (q("#run") as HTMLButtonElement).click();
    expect(q("#alert")!.hasAttribute("hidden")).toBe(true);
  });
});

describe("panneau: flux et journal", () => {
  it("journal: sans codes ANSI, sans ligne « resume: » en double du resume", () => {
    const send = load();
    send({ type: "info", sector: "research", message: "npm test failed: \u001b[2m | \u001b[22m\u001b[32m1833 passed\u001b[39m" });
    send({ type: "info", sector: "research", message: "resume: Échec : recherche." });
    const t = q("#log")!.textContent!;
    expect(t).toContain("npm test failed:  | 1833 passed");
    expect(t).not.toContain("\u001b");
    expect(t).not.toContain("resume:");
  });
  it("connexion perdue puis reprise", () => {
    const send = load();
    send.fail();
    expect(q("#conn")!.hasAttribute("hidden")).toBe(false);
    expect(q("#conn")!.textContent).toContain("Connexion perdue");
    send.open();
    expect(q("#conn")!.hasAttribute("hidden")).toBe(true);
  });
  it("journal: heure + type, filtre Erreurs seulement", () => {
    const send = load();
    send({ type: "info", message: "a" });
    send({ type: "error", message: "b" });
    expect(q("#log li time")!.textContent).toMatch(/^\d\d:\d\d:\d\d$/);
    const only = q("#onlyErr") as HTMLInputElement;
    only.checked = true; only.dispatchEvent(new Event("change"));
    const shown = [...document.querySelectorAll("#log li")].filter((li) => !li.hasAttribute("hidden"));
    expect(shown.length).toBe(1);
    expect(shown[0].classList.contains("error")).toBe(true);
  });
});

describe("panneau: ordre des phases", () => {
  it("barre des phases: Recherche, Design, Implementation, Correction (design d'abord)", () => {
    load();
    const labels = [...document.querySelectorAll("#phasebar .step")].map((e) => e.textContent ?? "");
    expect(labels.map((l) => /Recherche|Design|Implémentation|Correction/.exec(l)?.[0])).toEqual(["Recherche", "Design", "Implémentation", "Correction"]);
  });
});

describe("panneau: fin de boucle", () => {
  it("start/end x4 puis done: 4 etapes reussies, rien en cours, statut unique", () => {
    const send = load();
    for (const s of ["research", "implementation", "correction", "design"]) {
      send({ type: "start", sector: s });
      send({ type: "end", sector: s, costUsd: 0.1, totalUsd: 3.06, remainingUsd: 18.54 });
    }
    send({ type: "done", message: "terminé" });
    expect(document.querySelectorAll("#phasebar .step.ok").length).toBe(4);
    expect(document.body.textContent).not.toContain("en cours");
    expect(q("#status")!.textContent).toBe("Terminé · 2,83 € sur 20 €");
  });
  it("done ferme la phase restee en cours selon ses agents; arret => echec", () => {
    let send = load();
    send({ type: "start", sector: "correction" });
    send({ type: "end", sector: "correction", ok: true });
    send({ type: "start", sector: "correction", axis: "x" });
    send({ type: "done", message: "terminé" });
    expect(q("#phasebar .step.ok")).toBeTruthy();
    send = load();
    send({ type: "start", sector: "design" });
    send({ type: "done", message: "arrêté" });
    expect(q("#phasebar .step.fail")).toBeTruthy();
    expect(q("#status")!.textContent).toMatch(/^Arrêté/);
  });
  it("done avec `complete`: toutes les cartes terminees, ou cartes restantes", () => {
    let send = load();
    send({ type: "done", message: "terminé", complete: true });
    expect(q("#status")!.textContent).toMatch(/^Terminé, toutes les cartes/);
    send = load();
    send({ type: "done", message: "terminé", complete: false });
    expect(q("#status")!.textContent).toMatch(/^Terminé, cartes restantes/);
  });
  it("tournees: le message d'info « tournee N » est journalise", () => {
    const send = load();
    send({ type: "info", round: 2, message: "tournee 2 : 3 carte(s) restante(s)" });
    expect(q("#log")!.textContent).toContain("tournee 2");
  });
});
