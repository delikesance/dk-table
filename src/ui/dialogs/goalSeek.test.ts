// @vitest-environment jsdom
/** Tests de la boîte Valeur cible : recherche sans écriture, écriture après confirmation, échec signalé. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { openGoalSeek } from "./goalSeek";
import type { App } from "../appTypes";

const CELLS = { A1: { raw: "2" }, B1: { raw: "=3*A1+1" }, C1: { raw: "=A1+1" }, D1: { raw: "5" }, E1: { raw: "=A1*0+1" } };

function fakeApp() {
  const edit = vi.fn();
  return { app: { activeDoc: () => ({ cells: CELLS }), edit } as unknown as App, edit };
}
const box = (): HTMLElement => document.querySelector<HTMLElement>('.dk-dialog[data-id="goalseek"]')!;
const set = (n: string, v: string): void => { box().querySelector<HTMLInputElement>(`input[name="${n}"]`)!.value = v; };
const click = (a: string): void => box().querySelector<HTMLElement>(`[data-action="${a}"]`)!.click();
const fill = (f: string, t: string, v: string): void => { set("formula", f); set("target", t); set("variable", v); };
const alert = (): string => box().querySelector('[role="alert"]')!.textContent ?? "";

beforeEach(() => { document.body.innerHTML = ""; });

describe("openGoalSeek", () => {
  it("propose le résultat sans écrire, puis écrit après confirmation", () => {
    const { app, edit } = fakeApp();
    openGoalSeek(app);
    fill("B1", "16", "A1");
    click("seek");
    expect(box().querySelector('[role="status"]')!.textContent).toContain("5");
    expect(edit).not.toHaveBeenCalled();
    click("apply");
    expect(edit).toHaveBeenCalledWith("A1", "5");
  });
  it("refuse une cellule variable contenant une formule", () => {
    const { app, edit } = fakeApp();
    openGoalSeek(app);
    fill("B1", "16", "C1");
    click("seek");
    expect(alert()).toMatch(/constante/);
    expect(edit).not.toHaveBeenCalled();
  });
  it("refuse une cellule cible sans formule", () => {
    openGoalSeek(fakeApp().app);
    fill("D1", "16", "A1");
    click("seek");
    expect(alert()).toMatch(/formule/);
  });
  it("signale l'échec quand aucune solution n'existe", () => {
    const { app, edit } = fakeApp();
    openGoalSeek(app);
    fill("E1", "7", "A1");
    click("seek");
    expect(alert()).not.toBe("");
    expect(edit).not.toHaveBeenCalled();
  });
});
