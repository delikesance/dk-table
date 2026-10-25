import { describe, expect, it } from "vitest";
import { isRegressionError, linearRegression } from "./regression";

describe("linearRegression: valeurs", () => {
  it("points alignés y = 2x + 1 : pente 2, ordonnée 1, R² 1", () => {
    const r = linearRegression([1, 2, 3, 4], [3, 5, 7, 9]);
    if (isRegressionError(r)) throw new Error("erreur inattendue");
    expect(r.slope).toBeCloseTo(2, 10);
    expect(r.intercept).toBeCloseTo(1, 10);
    expect(r.r2).toBeCloseTo(1, 10);
    expect(r.count).toBe(4);
  });

  it("R² reste dans [0, 1] pour un nuage bruité", () => {
    const r = linearRegression([1, 2, 3, 4, 5], [2, 1, 4, 3, 7]);
    if (isRegressionError(r)) throw new Error("erreur inattendue");
    expect(r.r2).toBeGreaterThanOrEqual(0);
    expect(r.r2).toBeLessThanOrEqual(1);
    expect(r.r2).toBeLessThan(1);
  });
});

describe("linearRegression: paires exclues", () => {
  it("ignore les paires avec valeur manquante ou non numérique", () => {
    const r = linearRegression([1, "", 2, "abc", 3, 4], [3, 99, 5, 98, 7, true]);
    if (isRegressionError(r)) throw new Error("erreur inattendue");
    expect(r.count).toBe(3);
    expect(r.slope).toBeCloseTo(2, 10);
    expect(r.intercept).toBeCloseTo(1, 10);
  });
});

describe("linearRegression: erreurs explicites", () => {
  it("moins de 2 points valides donne une erreur", () => {
    const r = linearRegression([1, "", "x"], [2, 3, 4]);
    expect(isRegressionError(r)).toBe(true);
  });

  it("x constant donne une erreur (pente indéfinie)", () => {
    const r = linearRegression([2, 2, 2], [1, 2, 3]);
    expect(isRegressionError(r)).toBe(true);
  });

  it("l'erreur porte un message lisible", () => {
    const r = linearRegression([5], [5]);
    if (!isRegressionError(r)) throw new Error("succès inattendu");
    expect(r.message.length).toBeGreaterThan(0);
  });
});
