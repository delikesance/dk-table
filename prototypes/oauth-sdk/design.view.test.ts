// @vitest-environment jsdom
/** Tests de design.html : timeline, iframe sandbox, suivi du dernier design. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const html = readFileSync(join(__dirname, "design.html"), "utf8");
const DATA = {
  files: [
    { name: "a.html", bytes: 10, mtimeMs: 1000, state: "ecrit" },
    { name: "b.html", bytes: 20, mtimeMs: 2000, state: "mis-a-jour" },
  ],
  steps: [
    { type: "start", sector: "design" },
    { type: "file", sector: "design", message: "a.html" },
    { type: "end", sector: "design", ok: false, costUsd: 0.5 },
  ],
};

/** Charge la page dans jsdom avec fetch/EventSource factices. */
async function load(data: unknown) {
  const g = globalThis as Record<string, unknown>;
  g.fetch = async () => ({ ok: true, json: async () => data });
  g.EventSource = class { addEventListener() {} };
  document.documentElement.innerHTML = html.replace(/^[\s\S]*?<html[^>]*>/i, "");
  const code = [...document.querySelectorAll("script")].map((s) => s.textContent).join("\n");
  new Function(code)();
  await new Promise((r) => setTimeout(r, 10));
}

describe("design.html", () => {
  it("<= 200 lignes, theme sombre, ids stables", () => {
    expect(html.split("\n").length).toBeLessThanOrEqual(200);
    expect(html).toContain("prefers-color-scheme: dark");
    for (const id of ["timeline", "viewer", "thumbs"]) expect(html).toContain(`id="${id}"`);
  });
  it("timeline: étapes, badges texte, échec", async () => {
    await load(DATA);
    expect(document.querySelectorAll("#timeline .step").length).toBe(3);
    const t = document.getElementById("timeline")!.textContent!;
    expect(t).toContain("écrit");
    expect(t).toContain("Échec");
    expect(t).toContain("0,50 $");
    expect(document.querySelector("#timeline .badge")!.textContent).toBe("écrit");
  });
  it("iframe sandbox sans script sur le dernier design", async () => {
    await load(DATA);
    const f = document.querySelector("#viewer iframe") as HTMLIFrameElement;
    expect(f.getAttribute("src")).toBe("/designs/b.html");
    expect(f.hasAttribute("sandbox")).toBe(true);
    expect(f.getAttribute("sandbox")).not.toContain("allow-scripts");
  });
  it("miniatures: choisir fige le suivi", async () => {
    await load(DATA);
    const th = document.querySelectorAll("#thumbs .thumb");
    expect(th.length).toBe(2);
    (th[0] as HTMLElement).click();
    expect(document.querySelector("#viewer iframe")!.getAttribute("src")).toBe("/designs/a.html");
    expect(document.querySelector("#thumbs .thumb.sel")!.getAttribute("aria-current")).toBe("true");
  });
  it("historique: liste tous les designs (recap signale), choisir ouvre le design sans run actif", async () => {
    await load({ files: [...DATA.files, { name: "recap-x.html", bytes: 5, mtimeMs: 3000, state: "ecrit", kind: "recap" }], steps: [] });
    const sel = document.getElementById("history") as HTMLSelectElement;
    expect(sel.options.length).toBe(3);
    expect([...sel.options].map((o) => o.value)).toEqual(["recap-x.html", "b.html", "a.html"]);
    expect(sel.options[0].textContent).toContain("récap");
    // le suivi automatique ignore le recap: le dernier design reste b.html
    expect(document.querySelector("#viewer iframe")!.getAttribute("src")).toBe("/designs/b.html");
    sel.value = "a.html"; sel.dispatchEvent(new Event("change"));
    expect(document.querySelector("#viewer iframe")!.getAttribute("src")).toBe("/designs/a.html");
    expect((document.getElementById("history") as HTMLSelectElement).value).toBe("a.html");
  });
  it("etat vide", async () => {
    await load({ files: [], steps: [] });
    expect(document.querySelectorAll("#viewer .empty").length).toBe(1);
  });
  it("historique: etiquette visible et select aux jetons de la page", () => {
    expect(html).toMatch(/<label[^>]*for="history"[^>]*>Historique<\/label>/);
    expect(html).toMatch(/#history\{[^}]*background:var\(--panel\)[^}]*color:var\(--ink\)/);
    expect(html).toContain("color-scheme");
  });
  it("etapes: libelles lisibles, icones, carte de resume, horodatage", async () => {
    await load({ files: DATA.files, steps: [
      { type: "start", sector: "design", ts: 1000 },
      { type: "file", sector: "design", message: "a.html", ts: 1000 },
      { type: "info", sector: "design", message: "wt/design-x fusionne dans developpement", ts: 1500 },
      { type: "info", sector: "design", message: "resume: Terminé : recherche, design.", ts: 1600 },
      { type: "end", sector: "design", costUsd: 0.02, ts: 1700 },
      { type: "end", sector: "design", ok: false, ts: 1800 },
    ] });
    const t = document.getElementById("timeline")!.textContent!;
    for (const x of ["Démarrage du design", "Fichier écrit : a.html", "Fusionné dans developpement", "Terminé · 0,02 $", "Échec"]) expect(t).toContain(x);
    expect(t).not.toContain("resume:");
    expect(t).not.toContain("wt/design-x");
    expect(document.querySelector("#timeline .summary-card")!.textContent).toBe("Terminé : recherche, design.");
    expect(document.querySelectorAll("#timeline .step .ico").length).toBe(6);
    expect(document.querySelectorAll("#timeline .step .when").length).toBeGreaterThanOrEqual(6);
  });
  it("miniature choisie: contour 1px + pastille Affiché, pas de bordure epaisse", async () => {
    expect(html).toContain(".thumb.sel{outline:1px");
    await load(DATA);
    expect(document.querySelector("#thumbs .thumb.sel .badge-sel")!.textContent).toBe("Affiché");
    expect(document.querySelectorAll("#thumbs .badge-sel").length).toBe(1);
  });
});
