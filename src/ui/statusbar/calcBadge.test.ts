// @vitest-environment jsdom
/** Tests de l'indicateur de mode de calcul de la barre d'état : masqué en automatique, libellé en manuel/itératif. */
import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_CALC, setCalcMode } from "../../engine/calc-mode";
import { createCalcBadge } from "./calcBadge";

afterEach(() => setCalcMode(DEFAULT_CALC));

describe("createCalcBadge", () => {
  it("masqué en calcul automatique", () => {
    const b = createCalcBadge();
    expect(b.el.hidden).toBe(true);
    expect(b.el.textContent).toBe("");
    b.dispose();
  });

  it("affiche « Manuel » en mode manuel et se met à jour", () => {
    const b = createCalcBadge();
    setCalcMode({ manual: true });
    expect(b.el.hidden).toBe(false);
    expect(b.el.textContent).toBe("Manuel · F9");
    setCalcMode({ manual: false });
    expect(b.el.hidden).toBe(true);
    b.dispose();
  });

  it("affiche « Itératif » avec l'infobulle des réglages", () => {
    const b = createCalcBadge();
    setCalcMode({ iterative: true, maxIter: 50, maxChange: 0.01 });
    expect(b.el.textContent).toBe("Itératif");
    expect(b.el.title).toContain("50");
    b.dispose();
  });

  it("manuel et itératif ensemble : libellé combiné", () => {
    const b = createCalcBadge();
    setCalcMode({ manual: true, iterative: true });
    expect(b.el.textContent).toBe("Manuel · F9 · Itératif");
    b.dispose();
  });
});
