import { describe, it, expect } from "vitest";
import { validateList, parseListText } from "./custom-lists";

describe("validateList", () => {
  it("accepte une liste valide", () => {
    expect(validateList(["Bas", "Moyen", "Haut"], [])).toEqual({ ok: true, list: ["Bas", "Moyen", "Haut"] });
  });
  it("refuse une liste vide", () => {
    expect(validateList([], []).ok).toBe(false);
    expect(validateList(["  ", ""], []).ok).toBe(false);
  });
  it("refuse un doublon dans la liste (casse ignorée)", () => {
    expect(validateList(["Bas", "bas"], []).ok).toBe(false);
  });
  it("refuse une liste identique à une liste existante", () => {
    expect(validateList(["bas", "HAUT"], [["Bas", "Haut"]]).ok).toBe(false);
    expect(validateList(["Haut", "Bas"], [["Bas", "Haut"]]).ok).toBe(true);
  });
  it("refuse une liste de 1 élément (pas de recopie possible)", () => {
    expect(validateList(["Seul"], []).ok).toBe(false);
  });
});

describe("parseListText", () => {
  it("découpe par retours à la ligne et virgules, ignore les blancs", () => {
    expect(parseListText("Bas\nMoyen, Haut\n\n")).toEqual(["Bas", "Moyen", "Haut"]);
  });
});
