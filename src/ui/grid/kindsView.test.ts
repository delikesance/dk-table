// @vitest-environment jsdom
/** Surlignage formules / constantes : classes par cellule + commande de bascule. */
import { describe, expect, it } from "vitest";
import { mount } from "../app";
import { defaultRegistry } from "../palette/registry";

describe("surlignage formules / constantes", () => {
  it("marque formule et constante, la commande bascule la classe d'affichage", () => {
    document.body.innerHTML = '<div id="app"></div>';
    document.documentElement.classList.remove("dk-kinds");
    const app = mount(document.getElementById("app")!);
    app.edit("A1", "5"); app.edit("B1", "=A1*2"); app.edit("C1", "texte");
    const el = (k: string) => document.querySelector(`.dkg-cell[data-key="${k}"]`)!;
    expect(el("A1").classList.contains("dkg-kc")).toBe(true);
    expect(el("B1").classList.contains("dkg-kf")).toBe(true);
    expect(el("C1").classList.contains("dkg-kc")).toBe(false);
    const cmd = defaultRegistry.list().find((c) => c.id === "view.kinds")!;
    cmd.run();
    expect(document.documentElement.classList.contains("dk-kinds")).toBe(true);
    cmd.run();
    expect(document.documentElement.classList.contains("dk-kinds")).toBe(false);
  });
});
