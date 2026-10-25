import { describe, expect, it } from "vitest";
import { createSheet, setCell } from "../engine/sheet";
import { createCalc } from "./calc";
import type { RefBook } from "./refs";

function book(): RefBook {
  const s = createSheet();
  [["Commercial", "CA_T1", "Objectif"], ["Alice", "39500", "40000"], ["Bob", "40000", "35000"], ["Claire", "55000", "50000"]]
    .forEach((r, i) => r.forEach((v, j) => setCell(s, "ABC"[j] + (i + 1), v)));
  return { sheets: () => [{ id: "s1", name: "Synthese", sheet: s, styles: { B3: { format: "currency" }, C3: { format: "currency" } } }] };
}
const run = (src: string, fmt = "auto", b = book()) => { const c = createCalc(b); return c.eval(c.slot(), src, fmt); };

describe("calcul d'une puce", () => {
  it("évalue une formule sur les feuilles", () => {
    expect(run("{s1}!B3/{s1}!C3").text).toBe("1.14285714286");
    expect(run("SUM({s1}!B2:B4)").text).toBe("134500");
    expect(run("IF({s1}!B3>{s1}!C3;1;0)").text).toBe("1");
  });
  it("une simple référence garde le format de sa cellule (Auto)", () => {
    expect(run("{s1}!B3").text).toMatch(/40\D?000/);
    expect(run("{s1}!B3").text).toContain("€");
  });
  it("le format choisi s'applique", () => {
    expect(run("{s1}!B3/{s1}!C3", "percent").text).toMatch(/114/);
    expect(run("{s1}!B3/{s1}!C3", "percent").text).toContain("%");
  });
  it("suit la feuille quand elle change, avec le même emplacement", () => {
    const b = book(), c = createCalc(b), slot = c.slot();
    expect(c.eval(slot, "{s1}!B2*2", "auto").text).toBe("79000");
    setCell(b.sheets()[0].sheet, "B2", "10");
    expect(c.eval(slot, "{s1}!B2*2", "auto").text).toBe("20");
  });
  it("erreurs : cible disparue, division par zéro, syntaxe", () => {
    const r = run("{gone}!A1");
    expect(r.error).toBe(true);
    expect(r.text).toBe("#REF!");
    expect(run("1/0").text).toBe("#DIV/0!");
    expect(run("1+*").error).toBe(true);
  });
  it("une formule vide n'affiche rien", () => {
    expect(run("").text).toBe("");
  });
  it("deux puces ne se gênent pas", () => {
    const c = createCalc(book());
    const a = c.slot(), b = c.slot();
    expect(c.eval(a, "1+1", "auto").text).toBe("2");
    expect(c.eval(b, "2+2", "auto").text).toBe("4");
    expect(c.eval(a, "1+1", "auto").text).toBe("2");
  });
});

describe("mini-graphiques en ligne", () => {
  it("SPARKLINE, BAR et TREND sur une plage de feuille donnent du HTML", () => {
    expect(run("SPARKLINE({s1}!B2:B4)").html).toContain("<svg");
    expect(run("BAR({s1}!B2:B4)").html).toContain("<svg");
    expect(run("TREND({s1}!B2:B4)").html).toContain("live-trend");
  });
  it("plage inconnue : erreur, pas de graphique", () => {
    const r = run("BAR({gone}!B2:B4)");
    expect(r.html).toBeUndefined();
    expect(r.error).toBe(true);
  });
});
