// @vitest-environment jsdom
/** Dialogue « Outils d'analyse » : plage par défaut, erreurs sans écriture, création de la feuille. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { openAnalysis } from "./analysis";
import type { App } from "../appTypes";

const raw = (o: Record<string, string>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { raw: v }]));
const CELLS = raw({ A1: "Mois", B1: "Ventes", C1: "Marge", A2: "Jan", B2: "10", C2: "2", A3: "Fev", B3: "20", C3: "4" });

const field = (n: string) => document.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${n}"]`)!;
const run = () => document.querySelector<HTMLButtonElement>('[data-action="run"]')!.click();
const msg = () => document.querySelector(".dk-data__msg")!.textContent;

function setup(cells = CELLS) {
  const importSheet = vi.fn();
  const app = { activeDoc: () => ({ cells }), importSheet } as unknown as App;
  openAnalysis(app);
  return { importSheet };
}

beforeEach(() => { document.body.innerHTML = ""; });

describe("openAnalysis", () => {
  it("propose la zone utilisée comme plage et l'outil descriptif", () => {
    setup();
    expect((field("range") as HTMLInputElement).value).toBe("A1:C3");
    expect((field("tool") as HTMLSelectElement).value).toBe("descriptive");
    expect((field("headers") as HTMLInputElement).checked).toBe(true);
    expect((field("name") as HTMLInputElement).value).toBe("Analyse");
  });

  it("une plage vide ou invalide affiche une erreur et n'écrit rien", () => {
    const { importSheet } = setup();
    (field("range") as HTMLInputElement).value = "Z90:Z91";
    run();
    expect(msg()).toBe("Plage vide");
    (field("range") as HTMLInputElement).value = "n'importe quoi";
    run();
    expect(msg()).toBe("Plage invalide");
    expect(importSheet).not.toHaveBeenCalled();
  });

  it("valider crée une feuille avec les résultats et en-têtes", () => {
    const { importSheet } = setup();
    run();
    expect(importSheet).toHaveBeenCalledOnce();
    const [name, sheet] = importSheet.mock.calls[0];
    expect(name).toBe("Analyse");
    expect(sheet.cells.A1).toEqual({ raw: "Statistique" });
    expect(sheet.cells.B1).toEqual({ raw: "Ventes" });
    expect(document.querySelector(".dk-dialog")).toBeNull();
  });

  it("la régression demande les colonnes X et Y", () => {
    const { importSheet } = setup();
    (field("tool") as HTMLSelectElement).value = "regression";
    (field("tool") as HTMLSelectElement).dispatchEvent(new Event("change"));
    (field("x") as HTMLInputElement).value = "1";
    (field("y") as HTMLInputElement).value = "9";
    run();
    expect(msg()).toBe("Colonne X ou Y hors de la plage");
    expect(importSheet).not.toHaveBeenCalled();
  });

  it("annuler ne modifie aucune feuille", () => {
    const { importSheet } = setup();
    document.querySelector<HTMLButtonElement>('[data-action="close"]')!.click();
    expect(importSheet).not.toHaveBeenCalled();
  });
});
