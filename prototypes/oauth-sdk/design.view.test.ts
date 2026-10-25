// @vitest-environment jsdom
/** Tests de la page design : toile libre (scripts permis dans l'iframe isolee), viewports, theme, pause, erreurs, comparaison. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

const read = (f: string) => readFileSync(join(__dirname, f), "utf8");
const html = read("design.html"), css = read("design-view.css"), js = read("design-view.js");
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

/** Charge la page; `fetches` compte les GET /designs; `emit` simule un evenement SSE. */
async function load(data: unknown = DATA) {
  const g = globalThis as Record<string, unknown>;
  let current = data, fetches = 0;
  const handlers: (() => void)[] = [];
  g.fetch = async () => { fetches++; return { ok: true, json: async () => current }; };
  g.EventSource = class { set onmessage(f: () => void) { handlers.push(f); } };
  document.documentElement.innerHTML = html.replace(/^[\s\S]*?<html[^>]*>/i, "");
  new Function(js)();
  await new Promise((r) => setTimeout(r, 10));
  return {
    fetches: () => fetches,
    set: (d: unknown) => { current = d; },
    emit: () => handlers.forEach((f) => f()),
  };
}
const frame = () => document.querySelector("#viewer iframe") as HTMLIFrameElement;
const tick = (ms = 10) => new Promise((r) => setTimeout(r, ms));

describe("design: fichiers", () => {
  it("<= 201 lignes chacun, nav commune, theme sombre, ids stables", () => {
    for (const t of [html, css, js]) expect(t.split("\n").length).toBeLessThanOrEqual(201);
    expect(html).toContain('href="/panel.css"');
    expect(read("panel.css")).toContain("prefers-color-scheme: dark");
    for (const id of ["timeline", "viewer", "thumbs", "history", "errors", "zoom", "pause", "reload", "compare"]) expect(html).toContain(`id="${id}"`);
  });
});

describe("design: toile", () => {
  it("timeline: étapes, badges texte, échec", async () => {
    await load();
    expect(document.querySelectorAll("#timeline .step").length).toBe(3);
    const t = document.getElementById("timeline")!.textContent!;
    for (const w of ["écrit", "échec", "0.50"]) expect(t).toContain(w);
  });
  it("iframe: scripts permis mais isolee (jamais same-origin ni top-navigation)", async () => {
    await load();
    expect(frame().getAttribute("src")).toMatch(/^\/designs\/b\.html/);
    const sb = frame().getAttribute("sandbox") ?? "";
    expect(sb).toContain("allow-scripts");
    for (const bad of ["allow-same-origin", "allow-top-navigation", "allow-popups", "allow-forms"]) expect(sb).not.toContain(bad);
  });
  it("miniatures: choisir fige le suivi; historique liste tout, recap signale", async () => {
    await load({ files: [...DATA.files, { name: "recap-x.html", bytes: 5, mtimeMs: 3000, state: "ecrit", kind: "recap" }], steps: [] });
    (document.querySelectorAll("#thumbs .thumb")[0] as HTMLElement).click();
    expect(frame().getAttribute("src")).toMatch(/a\.html/);
    expect(document.querySelector("#thumbs .thumb.sel")!.getAttribute("aria-current")).toBe("true");
    const sel = document.getElementById("history") as HTMLSelectElement;
    expect([...sel.options].map((o) => o.value)).toEqual(["recap-x.html", "b.html", "a.html"]);
    expect(sel.options[0].textContent).toContain("récap");
  });
  it("etat vide", async () => {
    await load({ files: [], steps: [] });
    expect(document.querySelectorAll("#viewer .empty").length).toBe(1);
  });
});

describe("design: pas de rechargement inutile", () => {
  it("un rafraichissement sans changement garde la meme iframe; un fichier modifie la recharge", async () => {
    const h = await load();
    const f1 = frame();
    h.emit(); await tick(); h.emit(); await tick();
    expect(frame()).toBe(f1);
    h.set({ ...DATA, files: [DATA.files[0], { ...DATA.files[1], mtimeMs: 9999 }] });
    (document.getElementById("reload") as HTMLElement).click();
    expect(frame()).not.toBe(f1);
  });
  it("rafales d'evenements SSE: au plus une lecture de /designs par fenetre", async () => {
    const h = await load();
    const before = h.fetches();
    for (let i = 0; i < 20; i++) h.emit();
    await tick(50);
    expect(h.fetches() - before).toBeLessThanOrEqual(1);
  });
});

describe("design: viewports, zoom, theme, pause, erreurs, comparaison", () => {
  it("presets de largeur dimensionnent la toile", async () => {
    await load();
    (document.querySelector('[data-vp="390"]') as HTMLElement).click();
    expect((document.getElementById("viewer")!.firstElementChild as HTMLElement).style.width).toBe("390px");
    (document.querySelector('[data-vp="0"]') as HTMLElement).click();
    expect((document.getElementById("viewer")!.firstElementChild as HTMLElement).style.width).toBe("100%");
  });
  it("theme et pause sont envoyes a l'iframe (postMessage dk:1)", async () => {
    await load();
    const post = vi.fn();
    Object.defineProperty(frame(), "contentWindow", { value: { postMessage: post }, configurable: true });
    (document.querySelector('[data-theme-set="dark"]') as HTMLElement).click();
    expect(post).toHaveBeenCalledWith({ dk: 1, type: "theme", value: "dark" }, "*");
    (document.getElementById("pause") as HTMLElement).click();
    expect(post).toHaveBeenCalledWith({ dk: 1, type: "pause", value: true }, "*");
    expect((document.getElementById("pause") as HTMLElement).getAttribute("aria-pressed")).toBe("true");
  });
  it("erreurs de l'iframe courante listees; celles d'ailleurs ignorees", async () => {
    await load();
    const win = {};
    Object.defineProperty(frame(), "contentWindow", { value: win, configurable: true });
    window.dispatchEvent(new MessageEvent("message", { data: { dk: 1, type: "error", message: "boum (3:4)" }, source: win as MessageEventSource }));
    window.dispatchEvent(new MessageEvent("message", { data: { dk: 1, type: "error", message: "intrus" }, source: {} as MessageEventSource }));
    const t = document.getElementById("errors")!.textContent!;
    expect(t).toContain("boum (3:4)");
    expect(t).not.toContain("intrus");
  });
  it("changer de design efface les erreurs de l'ancien", async () => {
    await load();
    const win = {};
    Object.defineProperty(frame(), "contentWindow", { value: win, configurable: true });
    window.dispatchEvent(new MessageEvent("message", { data: { dk: 1, type: "error", message: "ancienne" }, source: win as MessageEventSource }));
    expect(document.getElementById("err-count")!.textContent).toBe("1");
    (document.querySelectorAll("#thumbs .thumb")[0] as HTMLElement).click();
    expect(document.getElementById("err-count")!.textContent).toBe("0");
  });
  it("comparer: deux iframes cote a cote, la seconde choisie dans la liste", async () => {
    await load();
    (document.getElementById("compare") as HTMLElement).click();
    expect(document.querySelectorAll("#viewer iframe").length).toBe(2);
    const sel = document.getElementById("history2") as HTMLSelectElement;
    sel.value = "a.html"; sel.dispatchEvent(new Event("change"));
    expect([...document.querySelectorAll("#viewer iframe")].map((f) => f.getAttribute("src"))).toEqual([expect.stringMatching(/b\.html/), expect.stringMatching(/a\.html/)]);
  });
});
