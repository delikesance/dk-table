// @vitest-environment jsdom
/** Tests du dialogue Saisie par formulaire (src/ui/dialogs/form.ts) sous jsdom. */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { openForm } from "./form";
import type { App } from "../appTypes";

/** Feuille de test : en-têtes en ligne 1, une ligne de données (A2:C2). */
const CELLS = {
  A1: { raw: "Nom" }, B1: { raw: "Qte" }, C1: { raw: "Date" },
  A2: { raw: "Ana" }, B2: { raw: "2" }, C2: { raw: "03/01/2026" },
};

/** Faux App : seules `activeDoc` et `editMany` sont appelées par le dialogue. */
function fakeApp() {
  const editMany = vi.fn();
  const app = { activeDoc: () => ({ cells: CELLS }), editMany } as unknown as App;
  return { app, editMany };
}

const box = (): HTMLElement => document.querySelector<HTMLElement>('.dk-dialog[data-id="form"]')!;
const field = (col: number): HTMLInputElement => box().querySelector<HTMLInputElement>(`input[data-field="${col}"]`)!;

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("openForm", () => {
  it("génère un champ par colonne, libellé = en-tête", () => {
    const { app } = fakeApp();
    openForm(app);
    expect([...box().querySelectorAll("label[data-label]")].map((l) => l.textContent?.trim())).toEqual(["Nom", "Qte", "Date"]);
    expect(field(1).inputMode).toBe("decimal");
  });

  it("un champ obligatoire vide bloque l'envoi et affiche l'erreur", () => {
    const { app, editMany } = fakeApp();
    openForm(app);
    box().querySelector<HTMLInputElement>('input[data-required="0"]')!.click();
    box().querySelector<HTMLButtonElement>('[data-action="submit"]')!.click();
    expect(editMany).not.toHaveBeenCalled();
    expect(box().querySelector('[data-error="0"]')?.textContent).toBe("Champ obligatoire");
  });

  it("un envoi valide écrit la ligne suivante puis réinitialise le formulaire", () => {
    const { app, editMany } = fakeApp();
    openForm(app);
    field(0).value = "Cy";
    field(1).value = "1,5";
    field(2).value = "31/12/2026";
    box().querySelector<HTMLButtonElement>('[data-action="submit"]')!.click();
    expect(editMany).toHaveBeenCalledWith({ A3: "Cy", B3: "1.5", C3: "31/12/2026" });
    expect(field(0).value).toBe("");
    expect(box().querySelector('[role="status"]')?.textContent).toContain("Ligne 3 ajoutée");
  });

  it("une valeur invalide (nombre) n'écrit rien", () => {
    const { app, editMany } = fakeApp();
    openForm(app);
    field(0).value = "Cy";
    field(1).value = "beaucoup";
    box().querySelector<HTMLButtonElement>('[data-action="submit"]')!.click();
    expect(editMany).not.toHaveBeenCalled();
    expect(box().querySelector('[data-error="1"]')?.textContent).toBe("Nombre attendu");
  });

  it("une seule instance: rouvrir ne duplique pas la boîte", () => {
    const { app } = fakeApp();
    openForm(app);
    openForm(app);
    expect(document.querySelectorAll('.dk-dialog[data-id="form"]').length).toBe(1);
  });
});
