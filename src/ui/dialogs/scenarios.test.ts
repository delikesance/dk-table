/** Boîte « Scénarios » : liste, enregistrement de la sélection (refus explicite au-delà de 32), application. */
// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { openScenarios } from "./scenarios";
import type { App } from "../appTypes";
import type { Scenario, ScenarioCell } from "../../engine/scenario";

function fakeApp(cells: ScenarioCell[]) {
  let list: Scenario[] = [];
  const app = {
    getScenarios: () => list,
    setScenarios: vi.fn((l: Scenario[]) => { list = l; }),
    applyScenario: vi.fn(),
    selectionScenarioCells: () => cells,
  };
  return app as unknown as App & typeof app;
}

const box = () => document.querySelector<HTMLElement>('.dk-dialog[data-id="scenarios"]')!;

describe("openScenarios", () => {
  beforeEach(() => { document.body.innerHTML = ""; });

  it("enregistre la sélection sous le nom donné", () => {
    const app = fakeApp([{ sheet: "s1", key: "B1", raw: "10" }]);
    openScenarios(app);
    box().querySelector<HTMLInputElement>('input[name="name"]')!.value = "Pire";
    box().querySelector<HTMLElement>('[data-action="save-scenario"]')!.click();
    expect(app.setScenarios).toHaveBeenCalledWith([expect.objectContaining({ name: "Pire" })]);
  });

  it("affiche le refus explicite quand la sélection dépasse 32 cellules", () => {
    const many = Array.from({ length: 33 }, (_, i) => ({ sheet: "s1", key: `A${i + 1}`, raw: "1" }));
    const app = fakeApp(many);
    openScenarios(app);
    box().querySelector<HTMLInputElement>('input[name="name"]')!.value = "Trop";
    box().querySelector<HTMLElement>('[data-action="save-scenario"]')!.click();
    expect(app.setScenarios).not.toHaveBeenCalled();
    expect(box().querySelector('[role="alert"]')!.textContent).toMatch(/32/);
  });
});
