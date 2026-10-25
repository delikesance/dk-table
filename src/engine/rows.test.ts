/** Tests de la croissance des lignes : pas de plafond, la feuille grandit par blocs de ROW_STEP dès qu'on écrit près de la fin. */
import { describe, expect, it } from "vitest";
import { ROW_STEP, lastUsedRow, rowsNeeded } from "./rows";

describe("lastUsedRow", () => {
  it("plus grande ligne non vide", () => {
    expect(lastUsedRow(["A1", "B3", "C2"])).toBe(3);
  });
  it("aucune cellule : 0", () => {
    expect(lastUsedRow([])).toBe(0);
  });
});

describe("rowsNeeded", () => {
  it("bloc initial de ROW_STEP lignes pour une feuille vide", () => {
    expect(ROW_STEP).toBe(1000);
    expect(rowsNeeded(0, 1000)).toBe(1000);
  });
  it("garde une réserve d'un bloc après la dernière ligne utilisée", () => {
    expect(rowsNeeded(1000, 1000)).toBe(2000);
    expect(rowsNeeded(1500, 1000)).toBe(3000);
  });
  it("ne rétrécit jamais", () => {
    expect(rowsNeeded(10, 5000)).toBe(5000);
  });
});
