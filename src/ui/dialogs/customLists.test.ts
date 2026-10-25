// @vitest-environment jsdom
/** Listes personnalisées (Paramètres > Listes personnalisées…): ajout, refus affiché, Échap ferme. */
import { beforeEach, describe, expect, it } from "vitest";
import { createCustomLists } from "../../io/customLists";
import { openCustomLists } from "./customLists";

const esc = (el: Element) => el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

beforeEach(() => { document.body.innerHTML = ""; localStorage.clear(); });

describe("Listes personnalisées", () => {
  it("boîte modale titrée, une seule instance", () => {
    const store = createCustomLists(null);
    openCustomLists(store); openCustomLists(store);
    const d = document.querySelectorAll('[role="dialog"][data-id="customLists"]');
    expect(d).toHaveLength(1);
    expect(d[0].querySelector("h2")!.textContent).toBe("Listes personnalisées");
  });

  it("ajoute une liste saisie par ligne et l'affiche", () => {
    const store = createCustomLists(null);
    openCustomLists(store);
    const box = document.querySelector<HTMLTextAreaElement>('[data-id="customLists"] textarea[name="items"]')!;
    box.value = "Bas\nMoyen\nHaut";
    document.querySelector<HTMLButtonElement>('[data-id="customLists"] button[data-action="add"]')!.click();
    expect(store.lists()).toEqual([["Bas", "Moyen", "Haut"]]);
    expect(box.value).toBe("");
    expect(document.querySelector('[data-id="customLists"] [data-role="lists"]')!.textContent).toContain("Bas, Moyen, Haut");
  });

  it("refuse une liste en doublon et affiche la raison sans rien enregistrer", () => {
    const store = createCustomLists(null);
    store.add(["Bas", "Haut"]);
    openCustomLists(store);
    const box = document.querySelector<HTMLTextAreaElement>('[data-id="customLists"] textarea[name="items"]')!;
    box.value = "Haut, Bas, Bas";
    document.querySelector<HTMLButtonElement>('[data-id="customLists"] button[data-action="add"]')!.click();
    expect(store.lists()).toHaveLength(1);
    expect(document.querySelector('[data-id="customLists"] [role="alert"]')!.textContent).toContain("double");
  });

  it("Échap ferme la boîte", () => {
    openCustomLists(createCustomLists(null));
    esc(document.querySelector('[data-id="customLists"]')!);
    expect(document.querySelector('[data-id="customLists"]')).toBeNull();
  });

  it("supprime une liste via son bouton", () => {
    const store = createCustomLists(null);
    store.add(["Bas", "Haut"]); store.add(["Nord", "Sud"]);
    openCustomLists(store);
    document.querySelector<HTMLButtonElement>('[data-id="customLists"] button[data-action="remove"][data-index="0"]')!.click();
    expect(store.lists()).toEqual([["Nord", "Sud"]]);
    expect(document.querySelector('[data-id="customLists"] [data-role="lists"]')!.textContent).not.toContain("Bas");
  });
});
