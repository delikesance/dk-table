import { describe, expect, it } from "vitest";
import { err } from "../types";
import { describeValues, isDescriptiveError } from "./descriptive";

/** Sample 2,4,4,4,5,5,7,9 (mean 5, population variance 4, sample variance 32/7). */
const SAMPLE = [2, 4, 4, 4, 5, 5, 7, 9];

describe("describeValues: valeurs", () => {
  it("renvoie les dix indicateurs", () => {
    const r = describeValues(SAMPLE);
    if (isDescriptiveError(r)) throw new Error("erreur inattendue");
    expect(r.count).toBe(8);
    expect(r.sum).toBe(40);
    expect(r.mean).toBe(5);
    expect(r.median).toBe(4.5);
    expect(r.mode).toBe(4);
    expect(r.min).toBe(2);
    expect(r.max).toBe(9);
    expect(r.range).toBe(7);
  });

  it("médiane d'un nombre impair de valeurs", () => {
    const r = describeValues([3, 1, 2]);
    if (isDescriptiveError(r)) throw new Error("erreur inattendue");
    expect(r.median).toBe(2);
  });
});

describe("describeValues: dispersion (échantillon, n-1)", () => {
  it("variance et écart-type sur n-1", () => {
    const r = describeValues(SAMPLE);
    if (isDescriptiveError(r)) throw new Error("erreur inattendue");
    expect(r.variance).toBeCloseTo(32 / 7, 10);
    expect(r.stdev).toBeCloseTo(Math.sqrt(32 / 7), 10);
  });
});

describe("describeValues: ignore les non-numériques", () => {
  it("ignore vides, texte, booléens", () => {
    const r = describeValues([1, "", "abc", true, 3, "5"]);
    if (isDescriptiveError(r)) throw new Error("erreur inattendue");
    expect(r.count).toBe(2);
    expect(r.sum).toBe(4);
    expect(r.mean).toBe(2);
  });

  it("aucune valeur numérique -> erreur claire", () => {
    const r = describeValues(["", "abc", true]);
    expect(isDescriptiveError(r)).toBe(true);
    if (isDescriptiveError(r)) expect(r.message).toMatch(/aucune valeur num/i);
  });

  it("une erreur de cellule se propage", () => {
    const r = describeValues([1, err("#DIV/0!")]);
    expect(isDescriptiveError(r)).toBe(true);
    expect(r).toMatchObject({ error: "#DIV/0!" });
  });
});

describe("describeValues: cas limites", () => {
  it("une seule valeur: écart-type et variance indéfinis (null)", () => {
    const r = describeValues([7]);
    if (isDescriptiveError(r)) throw new Error("erreur inattendue");
    expect(r.mean).toBe(7);
    expect(r.range).toBe(0);
    expect(r.variance).toBeNull();
    expect(r.stdev).toBeNull();
  });

  it("aucun mode si aucune valeur ne se répète", () => {
    const r = describeValues([1, 2, 3]);
    if (isDescriptiveError(r)) throw new Error("erreur inattendue");
    expect(r.mode).toBeNull();
  });
});
