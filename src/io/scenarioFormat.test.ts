/** Validation du champ `scenarios` d'un `.dktable` : formes valides, limites et feuilles inconnues refusées. */
import { describe, expect, it } from "vitest";
import { checkScenarios } from "./scenarioFormat";

const ok = { id: "sc-1", name: "Pire", cells: [{ sheet: "s1", key: "B1", raw: "10" }] };

describe("checkScenarios", () => {
  it("accepte une liste de scénarios valides", () => {
    expect(checkScenarios([ok], new Set(["s1"]))).toEqual([ok]);
  });

  it("refuse un scénario de plus de 32 cellules", () => {
    const cells = Array.from({ length: 33 }, (_, i) => ({ sheet: "s1", key: `A${i + 1}`, raw: "1" }));
    expect(() => checkScenarios([{ ...ok, cells }], new Set(["s1"]))).toThrow(/32/);
  });

  it("refuse une feuille inconnue", () => {
    expect(() => checkScenarios([ok], new Set(["autre"]))).toThrow(/sheet/);
  });

  it("refuse un nom absent ou une cellule mal formée", () => {
    expect(() => checkScenarios([{ ...ok, name: "" }], new Set(["s1"]))).toThrow(/name/);
    expect(() => checkScenarios([{ ...ok, cells: [{ sheet: "s1", key: 3 }] }], new Set(["s1"]))).toThrow(/cells/);
  });

  it("refuse une valeur qui n'est pas un tableau", () => {
    expect(() => checkScenarios({}, new Set())).toThrow(/array/);
  });
});
