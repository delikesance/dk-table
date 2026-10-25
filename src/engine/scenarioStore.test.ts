/** Registre des scénarios : copies défensives à l'écriture comme à la lecture. */
import { beforeEach, describe, expect, it } from "vitest";
import { getScenarios, setScenarios } from "./scenarioStore";
import type { Scenario } from "./scenario";

const base: Scenario = { id: "sc-1", name: "Base", cells: [{ sheet: "s1", key: "B1", raw: "1" }] };

describe("scenarioStore", () => {
  beforeEach(() => setScenarios([]));

  it("restitue ce qui a été posé", () => {
    setScenarios([base]);
    expect(getScenarios()).toEqual([base]);
  });

  it("ne partage pas les objets avec l'appelant", () => {
    setScenarios([base]);
    getScenarios()[0].cells[0].raw = "999";
    expect(getScenarios()[0].cells[0].raw).toBe("1");
    base.cells[0].raw = "42";
    expect(getScenarios()[0].cells[0].raw).toBe("1");
  });
});
