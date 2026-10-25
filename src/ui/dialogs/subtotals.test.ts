// @vitest-environment jsdom
/** Dialogue « Sous-totaux » : colonnes proposées, Valider, Annuler, Tout supprimer. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { openSubtotals } from "./subtotals";
import { forgetSubtotalPlans } from "./subtotalsApply";
import type { App } from "../appTypes";

const SHEET = { A1: "Cat", B1: "Montant", A2: "x", B2: "1", A3: "x", B3: "2" };
const SEL = ["A1", "B1", "A2", "B2", "A3", "B3"];

/** Faux classeur (sélection A1:B3) avec écritures espionnées. */
const fake = (cells: Record<string, string>) => {
  const editMany = vi.fn();
  const setOutlineLevels = vi.fn();
  const raw = Object.fromEntries(Object.entries(cells).map(([k, v]) => [k, { raw: v }]));
  const app = {
    editMany, setOutlineLevels, selectedKeys: () => SEL, activeDoc: () => ({ cells: raw }), activeDocId: () => "s1",
  } as unknown as App;
  return { app, editMany, setOutlineLevels };
};

const dialog = () => document.querySelector<HTMLElement>(".dk-dialog")!;
const apply = () => dialog().querySelector<HTMLButtonElement>('[data-action="apply"]')!;
/** Coche la colonne `rel` (relative à la sélection) comme colonne à totaliser. */
const tick = (rel: number) => {
  dialog().querySelector<HTMLInputElement>(`input[name="value"][value="${rel}"]`)!.checked = true;
  dialog().querySelector<HTMLInputElement>(`input[name="value"][value="${rel}"]`)!.dispatchEvent(new Event("change"));
};

beforeEach(() => {
  document.body.innerHTML = "";
  forgetSubtotalPlans();
});

describe("dialogue Sous-totaux", () => {
  it("propose les colonnes de la sélection pour le groupe et les valeurs", () => {
    openSubtotals(fake(SHEET).app);
    const group = dialog().querySelector<HTMLSelectElement>('select[name="group"]')!;
    expect(Array.from(group.options).map((o) => o.value)).toEqual(["0", "1"]);
    expect(dialog().querySelectorAll('input[name="value"]')).toHaveLength(2);
  });

  it("Valider sans colonne à totaliser est désactivé", () => {
    openSubtotals(fake(SHEET).app);
    expect(apply().disabled).toBe(true);
    tick(1);
    expect(apply().disabled).toBe(false);
  });

  it("Valider applique le plan et ferme la boîte", () => {
    const { app, editMany, setOutlineLevels } = fake(SHEET);
    openSubtotals(app);
    tick(1);
    apply().click();
    expect(editMany).toHaveBeenCalledWith(expect.objectContaining({ A4: "Total x", B4: "3", B5: "3" }));
    expect(setOutlineLevels).toHaveBeenCalledWith([0, 1, 1, 0, 0]);
    expect(document.querySelector(".dk-dialog")).toBeNull();
  });

  it("Annuler ne modifie pas la feuille", () => {
    const { app, editMany, setOutlineLevels } = fake(SHEET);
    openSubtotals(app);
    tick(1);
    dialog().querySelector<HTMLButtonElement>('[data-action="close"]')!.click();
    expect(editMany).not.toHaveBeenCalled();
    expect(setOutlineLevels).not.toHaveBeenCalled();
  });

  it("Tout supprimer retire les sous-totaux et le plan", () => {
    const { app, editMany, setOutlineLevels } = fake(SHEET);
    openSubtotals(app);
    tick(1);
    apply().click();
    editMany.mockClear();
    openSubtotals(app);
    dialog().querySelector<HTMLButtonElement>('[data-action="remove"]')!.click();
    expect(editMany).toHaveBeenCalledWith(expect.objectContaining({ A4: "", B5: "" }));
    expect(setOutlineLevels).toHaveBeenLastCalledWith([]);
    expect(document.querySelector(".dk-dialog")).toBeNull();
  });

  it("message d'erreur affiché si l'application est refusée", () => {
    openSubtotals(fake({ ...SHEET, A4: "zzz" }).app);
    tick(1);
    apply().click();
    expect(dialog().querySelector(".dk-dialog__error")!.textContent).toMatch(/écras/i);
    expect(document.querySelector(".dk-dialog")).not.toBeNull();
  });
});
