// @vitest-environment jsdom
/** Tests de la vue Kanban : colonnes, « Sans statut », déplacement met à jour la ligne, filtre appliqué. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { openKanban } from "./kanban";
import type { App } from "../appTypes";

const CELLS = {
  A1: { raw: "Tâche" }, B1: { raw: "Statut" },
  A2: { raw: "A" }, B2: { raw: "À faire" },
  A3: { raw: "B" }, B3: { raw: "En cours" },
  A4: { raw: "C" },
};
function fakeApp(hidden: number[] = []) {
  const edit = vi.fn();
  return { app: { activeDoc: () => ({ cells: CELLS }), edit, rowHidden: (r: number) => hidden.includes(r) } as unknown as App, edit };
}
const box = (): HTMLElement => document.querySelector<HTMLElement>('.dk-dialog[data-id="kanban"]')!;
const move = (row: number, to: string): void => {
  const sel = box().querySelector<HTMLSelectElement>(`[data-row="${row}"] select`)!;
  sel.value = to;
  sel.dispatchEvent(new Event("change"));
};

beforeEach(() => { document.body.innerHTML = ""; });

describe("openKanban", () => {
  it("affiche une colonne par statut plus « Sans statut »", () => {
    openKanban(fakeApp().app);
    const names = [...box().querySelectorAll("[data-col]")].map((c) => (c as HTMLElement).dataset.col);
    expect(names).toEqual(["À faire", "En cours", "Sans statut"]);
    expect(box().querySelectorAll('[data-col="Sans statut"] [data-row]')).toHaveLength(1);
  });
  it("déplacer une carte met à jour le statut de la ligne", () => {
    const { app, edit } = fakeApp();
    openKanban(app);
    move(2, "En cours");
    expect(edit).toHaveBeenCalledWith("B2", "En cours");
  });
  it("déplacer vers « Sans statut » vide la cellule", () => {
    const { app, edit } = fakeApp();
    openKanban(app);
    move(3, "Sans statut");
    expect(edit).toHaveBeenCalledWith("B3", "");
  });
  it("garde le filtre de la vue courante", () => {
    openKanban(fakeApp([2]).app);
    expect(box().querySelector('[data-row="2"]')).toBeNull();
  });
});
