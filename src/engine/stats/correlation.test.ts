import { describe, expect, it } from "vitest";
import { correlationMatrix, isCorrelationError, pearson } from "./correlation";

describe("pearson: valeurs", () => {
  it("y = 2x donne 1", () => {
    const r = pearson([1, 2, 3, 4], [2, 4, 6, 8]);
    if (isCorrelationError(r)) throw new Error("erreur inattendue");
    expect(r.r).toBeCloseTo(1, 10);
  });

  it("y = -x donne -1", () => {
    const r = pearson([1, 2, 3], [3, 2, 1]);
    if (isCorrelationError(r)) throw new Error("erreur inattendue");
    expect(r.r).toBeCloseTo(-1, 10);
  });

  it("résultat toujours dans [-1, 1]", () => {
    const r = pearson([1, 5, 2, 8, 3], [2, 1, 7, 3, 9]);
    if (isCorrelationError(r)) throw new Error("erreur inattendue");
    expect(r.r).toBeGreaterThanOrEqual(-1);
    expect(r.r).toBeLessThanOrEqual(1);
  });
});

describe("pearson: paires ignorées", () => {
  it("ignore les paires où une valeur n'est pas numérique", () => {
    const r = pearson([1, "", 2, "abc", 3], [2, 99, 4, 98, 6]);
    if (isCorrelationError(r)) throw new Error("erreur inattendue");
    expect(r.count).toBe(3);
    expect(r.r).toBeCloseTo(1, 10);
    expect(Number.isNaN(r.r)).toBe(false);
  });
});

describe("pearson: erreurs explicites", () => {
  it("variance nulle donne une erreur #DIV/0!", () => {
    const r = pearson([2, 2, 2], [1, 2, 3]);
    expect(isCorrelationError(r)).toBe(true);
  });

  it("moins de deux paires donne une erreur", () => {
    const r = pearson([1], [2]);
    expect(isCorrelationError(r)).toBe(true);
  });
});

describe("correlationMatrix", () => {
  const COLS = [
    [1, 2, 3, 4],
    [2, 4, 6, 8],
    [4, 3, 2, 1],
  ];

  it("est N×N avec 1 sur la diagonale", () => {
    const m = correlationMatrix(COLS);
    expect(m.length).toBe(3);
    m.forEach((row) => expect(row.length).toBe(3));
    expect(m[0][0]).toBe(1);
    expect(m[1][1]).toBe(1);
    expect(m[2][2]).toBe(1);
  });

  it("est symétrique et contient les corrélations de paires", () => {
    const m = correlationMatrix(COLS);
    expect(m[0][1]).toBeCloseTo(1, 10);
    expect(m[1][0]).toBe(m[0][1]);
    expect(m[0][2]).toBeCloseTo(-1, 10);
    expect(m[2][0]).toBe(m[0][2]);
  });

  it("colonne de variance nulle donne null, sans NaN", () => {
    const m = correlationMatrix([[1, 2, 3], [5, 5, 5]]);
    expect(m[1][1]).toBeNull();
    expect(m[0][1]).toBeNull();
    expect(m[0][0]).toBe(1);
  });
});
