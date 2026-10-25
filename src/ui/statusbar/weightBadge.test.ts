// @vitest-environment jsdom
/** Tests de l'indicateur de poids de la barre d'état : texte, niveau, infobulle. */
import { describe, expect, it } from "vitest";
import { WEIGHT_HEAVY_CELLS, WEIGHT_WARN_CELLS } from "../../engine/weight";
import { createWeightBadge } from "./weightBadge";

describe("createWeightBadge", () => {
  it("affiche cellules et poids, niveau léger", () => {
    const b = createWeightBadge();
    b.update(["12", "abcd"]);
    expect(b.el.textContent).toContain("2 cellules");
    expect(b.el.textContent).toContain("6 o");
    expect(b.el.dataset.level).toBe("leger");
  });
  it("niveau lourd : data-level et infobulle de performance", () => {
    const b = createWeightBadge();
    b.update(Array(WEIGHT_WARN_CELLS + 1).fill("1"));
    expect(b.el.dataset.level).toBe("lourd");
    expect(b.el.title).toContain("ralentir");
  });
  it("niveau très lourd", () => {
    const b = createWeightBadge();
    b.update(Array(WEIGHT_HEAVY_CELLS + 1).fill("1"));
    expect(b.el.dataset.level).toBe("tres-lourd");
  });
});
