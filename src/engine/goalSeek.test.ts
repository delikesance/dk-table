/** Tests de goalSeek.ts : valeur cible sur une cellule (racine, erreurs explicites, restauration). */
import { describe, expect, it } from "vitest";
import { createSheet, getRaw, getValue, setCell } from "./sheet";
import { goalSeek } from "./goalSeek";

/** Feuille avec A1 = `a1` (variable) et B1 = `b1` (formule à atteindre). */
function sheet(a1: string, b1: string) {
  const s = createSheet();
  setCell(s, "A1", a1);
  setCell(s, "B1", b1);
  return s;
}

describe("goalSeek: racine sur une cellule", () => {
  it("ajuste une constante pour un résultat linéaire", () => {
    const s = sheet("2", "=3*A1+1");
    const r = goalSeek(s, "B1", "A1", 16);
    expect(r.ok).toBe(true);
    expect(getValue(s, "A1")).toBeCloseTo(5, 9);
    expect(Math.abs((getValue(s, "B1") as number) - 16)).toBeLessThanOrEqual(1e-6);
  });

  it("atteint la cible à 1e-6 près sur une fonction non linéaire", () => {
    const s = sheet("2", "=A1*A1+1");
    const r = goalSeek(s, "B1", "A1", 10);
    expect(r.ok).toBe(true);
    expect(Math.abs((getValue(s, "B1") as number) - 10)).toBeLessThanOrEqual(1e-6);
    expect(getValue(s, "A1")).toBeCloseTo(3, 6);
  });

  it("trouve une racine lointaine du point de départ", () => {
    const s = sheet("1", "=A1*1000");
    const r = goalSeek(s, "B1", "A1", 123456);
    expect(r.ok).toBe(true);
    expect(getValue(s, "A1")).toBeCloseTo(123.456, 6);
  });

  it("garde la variable numérique pour une racine à exposant", () => {
    const s = sheet("1", "=A1*1000000000");
    const r = goalSeek(s, "B1", "A1", 3);
    expect(r.ok).toBe(true);
    expect(getValue(s, "A1")).toBeCloseTo(3e-9, 15);
    expect(typeof getValue(s, "A1")).toBe("number");
  });

  it("renvoie la valeur d'origine dans `original`", () => {
    const s = sheet("2", "=3*A1+1");
    const r = goalSeek(s, "B1", "A1", 16);
    expect(r.ok && r.original).toBe("2");
  });
});

describe("goalSeek: erreurs explicites et restauration", () => {
  it("signale l'absence de racine et restaure la valeur d'origine", () => {
    const s = sheet("2", "=A1*A1+1");
    const r = goalSeek(s, "B1", "A1", -5);
    expect(r).toMatchObject({ ok: false, reason: "no-root" });
    expect(getRaw(s, "A1")).toBe("2");
    expect(getValue(s, "A1")).toBe(2);
  });

  it("refuse une cellule variable qui est une formule", () => {
    const s = sheet("=2", "=3*A1+1");
    expect(goalSeek(s, "B1", "A1", 16)).toMatchObject({ ok: false, reason: "variable-not-constant" });
    expect(getRaw(s, "A1")).toBe("=2");
  });

  it("refuse une cellule variable vide ou texte", () => {
    expect(goalSeek(sheet("", "=3*A1+1"), "B1", "A1", 16)).toMatchObject({
      ok: false,
      reason: "variable-not-constant",
    });
    expect(goalSeek(sheet("abc", "=3*A1+1"), "B1", "A1", 16)).toMatchObject({
      ok: false,
      reason: "variable-not-constant",
    });
  });

  it("refuse une cellule résultat qui n'est pas une formule", () => {
    const s = sheet("2", "5");
    expect(goalSeek(s, "B1", "A1", 16)).toMatchObject({ ok: false, reason: "not-formula" });
    expect(getRaw(s, "A1")).toBe("2");
  });

  it("refuse une cible non finie", () => {
    const s = sheet("2", "=3*A1+1");
    expect(goalSeek(s, "B1", "A1", Number.NaN)).toMatchObject({ ok: false, reason: "bad-target" });
    expect(goalSeek(s, "B1", "A1", Infinity)).toMatchObject({ ok: false, reason: "bad-target" });
  });

  it("échoue explicitement quand le nombre d'itérations est épuisé", () => {
    const s = sheet("2", "=A1*A1+1");
    const r = goalSeek(s, "B1", "A1", 10, { maxEval: 1 });
    expect(r).toMatchObject({ ok: false, reason: "max-eval" });
    expect(r.ok).toBe(false);
    expect(getRaw(s, "A1")).toBe("2");
  });
});
