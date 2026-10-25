// @vitest-environment jsdom
/** Tests de la vue Galerie : une carte par ligne, champs choisis, clic = sélection de la ligne. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { openGallery } from "./gallery";
import type { App } from "../appTypes";

const CELLS = {
  A1: { raw: "Nom" }, B1: { raw: "Ville" }, C1: { raw: "Qte" },
  A2: { raw: "Ana" }, B2: { raw: "Lyon" }, C2: { raw: "2" },
  A3: { raw: "Ben" }, B3: { raw: "Nice" }, C3: { raw: "1" },
};
function fakeApp() {
  const select = vi.fn();
  return { app: { activeDoc: () => ({ cells: CELLS }), select, rowHidden: () => false } as unknown as App, select };
}
const box = (): HTMLElement => document.querySelector<HTMLElement>('.dk-dialog[data-id="gallery"]')!;

beforeEach(() => { document.body.innerHTML = ""; });

describe("openGallery", () => {
  it("affiche une carte par ligne avec les champs cochés", () => {
    openGallery(fakeApp().app);
    expect(box().querySelectorAll("[data-card]")).toHaveLength(2);
    expect(box().querySelector('[data-card="2"]')!.textContent).toContain("Qte");
    box().querySelector<HTMLInputElement>('input[data-field="2"]')!.click();
    expect(box().querySelector('[data-card="2"]')!.textContent).not.toContain("Qte");
  });
  it("un clic sur une carte sélectionne la ligne", () => {
    const { app, select } = fakeApp();
    openGallery(app);
    box().querySelector<HTMLElement>('[data-card="3"]')!.click();
    expect(select).toHaveBeenCalledWith("A3");
  });
});
