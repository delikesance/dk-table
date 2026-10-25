/** Tests du poids d'un classeur : compte, caractères, niveau (léger / lourd / très lourd). */
import { describe, expect, it } from "vitest";
import { WEIGHT_HEAVY_CELLS, WEIGHT_WARN_CELLS, formatBytes, sheetWeight } from "./weight";

describe("sheetWeight", () => {
  it("compte les cellules non vides et leurs caractères", () => {
    const w = sheetWeight(["12", "", "abcd"]);
    expect(w.cells).toBe(2);
    expect(w.chars).toBe(6);
    expect(w.bytes).toBe(6);
    expect(w.level).toBe("leger");
  });
  it("vide : léger, zéro", () => {
    expect(sheetWeight([])).toEqual({ cells: 0, chars: 0, bytes: 0, level: "leger" });
  });
  it("seuil lourd au-delà de WEIGHT_WARN_CELLS", () => {
    expect(sheetWeight(Array(WEIGHT_WARN_CELLS).fill("1")).level).toBe("leger");
    expect(sheetWeight(Array(WEIGHT_WARN_CELLS + 1).fill("1")).level).toBe("lourd");
  });
  it("seuil très lourd au-delà de WEIGHT_HEAVY_CELLS", () => {
    expect(sheetWeight(Array(WEIGHT_HEAVY_CELLS + 1).fill("1")).level).toBe("tres-lourd");
  });
  it("les caractères comptent même sans nombre de cellules élevé", () => {
    expect(sheetWeight(["x".repeat(10_000)]).chars).toBe(10_000);
  });
});

describe("formatBytes", () => {
  it("octets, Ko, Mo en français", () => {
    expect(formatBytes(12)).toBe("12 o");
    expect(formatBytes(1536)).toBe("1,5 Ko");
    expect(formatBytes(1_258_291)).toBe("1,2 Mo");
  });
});
