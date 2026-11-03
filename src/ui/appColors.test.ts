// @vitest-environment jsdom
/** Couleurs déjà utilisées dans le document: proposées par les sélecteurs de couleur. */
import { beforeEach, describe, expect, it } from "vitest";
import { mount, type App } from "./app";

let app: App;
beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '<div id="app"></div>';
  app = mount(document.getElementById("app")!);
});

describe("usedColors", () => {
  it("liste fond et texte séparément, du plus utilisé au moins utilisé, normalisées", () => {
    app.select("A1:A3"); app.style({ fill: "#FF8800", color: "#112233" });
    app.select("B1"); app.style({ fill: "#12ab34" });
    app.select("B2"); app.style({ fill: "#ff8800" });
    expect(app.usedColors("fill")).toEqual(["#ff8800", "#12ab34"]);
    expect(app.usedColors("text")).toEqual(["#112233"]);
  });
  it("vide sans style; couleur retirée = disparue", () => {
    expect(app.usedColors("fill")).toEqual([]);
    app.select("A1"); app.style({ fill: "#abcdef" });
    app.style({ fill: undefined });
    expect(app.usedColors("fill")).toEqual([]);
  });
  it("le sélecteur de la barre d'outils les affiche à l'ouverture", async () => {
    app.select("A1"); app.style({ fill: "#abcdef" });
    document.querySelector<HTMLButtonElement>('[data-action="fill"]')!.click();
    await new Promise((r) => setTimeout(r, 0));
    const sw = [...document.querySelectorAll<HTMLElement>('.color-picker[aria-label="Couleur de fond"] .color-doc button')];
    expect(sw.map((b) => b.dataset.color)).toEqual(["#abcdef"]);
  });
});
