// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { mount, type App } from "./app";

let app: App;
let root: HTMLElement;
const marked = () => [...root.querySelectorAll<HTMLElement>(".dkg-special")].map((e) => e.dataset.key);

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById("app")!;
  app = mount(root);
  app.editMany({ A1: "5", B1: "=A1*2", A2: "=1/0", B2: "texte", C2: "=B1+1" });
});

describe("Atteindre spécial (app)", () => {
  it("formules : sélectionne la première trouvée et marque toutes les autres", () => {
    expect(app.goSpecial({ kind: "formulas" })).toBe(3);
    expect(app.selection()).toBe("B1");
    expect(marked()).toEqual(["B1", "A2", "C2"]);
  });

  it("types de résultat : seules les erreurs", () => {
    expect(app.goSpecial({ kind: "formulas", types: ["error"] })).toBe(1);
    expect(app.selection()).toBe("A2");
    expect(marked()).toEqual(["A2"]);
  });

  it("rien trouvé : renvoie 0 et ne change pas la sélection", () => {
    app.select("A1");
    expect(app.goSpecial({ kind: "formulas", types: [] })).toBe(0);
    expect(app.selection()).toBe("A1");
    expect(marked()).toEqual([]);
  });

  it("toute nouvelle sélection efface les marques", () => {
    expect(app.goSpecial({ kind: "constants" })).toBe(2); // A1 et B2 (texte)
    expect(marked()).toEqual(["A1", "B2"]);
    app.select("D9");
    expect(marked()).toEqual([]);
  });
});
