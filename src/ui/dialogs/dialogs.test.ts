// @vitest-environment jsdom
/** Paramètres (Fichier > Paramètres…, Ctrl+,) et À propos (Aide) : boîtes modales sobres, Échap ferme. */
import { beforeEach, describe, expect, it } from "vitest";
import { openSettings, homeOnStartup, HOME_KEY } from "./settings";
import { openAbout } from "./about";

const esc = (el: Element) => el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

beforeEach(() => { document.body.innerHTML = ""; localStorage.clear(); });

describe("Paramètres", () => {
  it("boîte modale titrée, une seule instance", () => {
    openSettings(); openSettings();
    const d = document.querySelectorAll('[role="dialog"][aria-modal="true"]');
    expect(d).toHaveLength(1);
    expect(d[0].querySelector("h2")!.textContent).toBe("Paramètres");
  });
  it("accueil au démarrage : coché par défaut, mémorisé quand on décoche", () => {
    expect(homeOnStartup()).toBe(true);
    openSettings();
    const box = document.querySelector<HTMLInputElement>('input[name="home"]')!;
    expect(box.checked).toBe(true);
    box.click();
    expect(localStorage.getItem(HOME_KEY)).toBe("0");
    expect(homeOnStartup()).toBe(false);
  });
  it("Échap et Fermer referment", () => {
    openSettings();
    esc(document.querySelector(".dk-dialog")!);
    expect(document.querySelector(".dk-dialog")).toBeNull();
    openSettings();
    document.querySelector<HTMLElement>('[data-action="close"]')!.click();
    expect(document.querySelector(".dk-dialog")).toBeNull();
  });
});

describe("À propos", () => {
  it("montre l'Atlas (clair + nuit) et les crédits, sans autre texte", () => {
    openAbout();
    const d = document.querySelector('[role="dialog"]')!;
    expect(d.querySelectorAll("img.dk-art__img")).toHaveLength(2);
    expect(d.textContent).toContain("Brendamour");
    expect(d.textContent).toContain("SIL Open Font License");
    esc(d);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
});
