// @vitest-environment jsdom
/** Accueil (refonte Hermes, H4) : actions + fichiers récents à gauche, Atlas à droite, aucun texte décoratif. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { showOnboarding, type HomeActions } from "./onboarding";

let host: HTMLElement;
let recents: { path: string; name: string }[];
const actions = (): HomeActions => ({
  recents: () => recents, onNew: vi.fn(), onOpen: vi.fn(), onImportCsv: vi.fn(), onOpenRecent: vi.fn(),
});
const act = (a: string) => host.querySelector<HTMLElement>(`[data-action="${a}"]`)!;

beforeEach(() => {
  document.body.innerHTML = '<div id="h"></div>';
  host = document.getElementById("h")!;
  recents = [{ path: "/d/budget.dktable", name: "budget.dktable" }, { path: "/d/t3.csv", name: "t3.csv" }];
});

describe("accueil", () => {
  it("dialogue modal avec trois actions, focus sur « Nouveau classeur »", () => {
    showOnboarding(host, actions());
    expect(host.querySelector('[role="dialog"][aria-modal="true"]')).not.toBeNull();
    expect(["new", "open", "import"].map((a) => act(a)?.textContent)).toEqual([
      expect.stringContaining("Nouveau classeur"), expect.stringContaining("Ouvrir"), expect.stringContaining("Importer CSV"),
    ]);
    expect(document.activeElement).toBe(act("new"));
  });
  it("chaque action ferme l'accueil puis la lance", () => {
    for (const [a, fn] of [["new", "onNew"], ["open", "onOpen"], ["import", "onImportCsv"]] as const) {
      const h = actions();
      showOnboarding(host, h);
      act(a).click();
      expect(host.querySelector(".ob")).toBeNull();
      expect(h[fn]).toHaveBeenCalledOnce();
    }
  });
  it("liste des récents (nom + chemin) ; clic = ouverture", () => {
    const h = actions();
    showOnboarding(host, h);
    const items = host.querySelectorAll<HTMLElement>("[data-recent]");
    expect([...items].map((i) => i.querySelector(".ob__name")!.textContent)).toEqual(["budget.dktable", "t3.csv"]);
    expect(items[1].textContent).toContain("/d/t3.csv");
    items[1].click();
    expect(h.onOpenRecent).toHaveBeenCalledWith("/d/t3.csv");
    expect(host.querySelector(".ob")).toBeNull();
  });
  it("sans récents : pas de section ni de texte de remplissage", () => {
    recents = [];
    showOnboarding(host, actions());
    expect(host.querySelector(".ob__recents")).toBeNull();
    expect(host.querySelector(".ob__empty")).toBeNull();
  });
  it("Atlas en clair et en nuit, avec crédit ; pas de libellé décoratif", () => {
    showOnboarding(host, actions());
    expect(host.querySelectorAll(".ob img.dk-art__img")).toHaveLength(2);
    expect(host.querySelector("figcaption")!.textContent).toContain("domaine public");
    expect(host.textContent).not.toContain("//");
  });
  it("Échap ferme", () => {
    showOnboarding(host, actions());
    host.querySelector<HTMLElement>(".ob")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(host.querySelector(".ob")).toBeNull();
  });
});
